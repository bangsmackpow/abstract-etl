const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db');
const { users, tenants } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');
const {
  setUserMfa,
  setUserOtp,
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
  createTenant,
  createUserForTenant,
} = require('./tenantRepo');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const JWT_EXPIRES_IN = '24h';

async function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function getUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  return user || null;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tenantId: user.tenantId || null,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function loadTenantFor(user) {
  if (!user.tenantId) return null;
  const [tenant] = await db
    .select({ id: tenants.id, name: tenants.name, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);
  if (tenant && tenant.status === 'suspended') {
    throw new Error('Account access is suspended');
  }
  return tenant || null;
}

async function login(email, password) {
  const user = await getUserByEmail(email);
  if (!user) {
    console.warn(`[AuthService] No user found with email: "${(email || '').trim().toLowerCase()}"`);
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = comparePassword(password, user.password);
  if (!isPasswordValid) {
    console.warn(`[AuthService] Password mismatch for user: ${user.email}`);
    throw new Error('Invalid email or password');
  }

  const tenant = await loadTenantFor(user);

  // MFA: signal that step 2 (OTP) is required. The route generates + emails
  // the OTP so it can send the raw code.
  if (user.mfaEnabled) {
    return {
      needsMfa: true,
      userId: user.id,
      email: user.email,
      otpSentTo: user.email,
      token: null,
      user: null,
      tenantName: tenant ? tenant.name : null,
    };
  }

  const token = generateToken(user);
  const { password: _password, ...userWithoutPassword } = user;
  return {
    user: {
      ...userWithoutPassword,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
      tenantName: tenant ? tenant.name : null,
    },
    token,
  };
}

/**
 * Public self-serve signup: creates a tenant on a 7-day free trial plus the
 * tenant admin user, then returns a JWT (Track 4). No platform approval.
 */
async function signup({ companyName, name, email, password }) {
  if (!companyName || !name || !email || !password) {
    throw new Error('Company name, name, email, and password are required');
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await getUserByEmail(email);
  if (existing) throw new Error('An account with this email already exists');

  const trialEndsAt = Math.floor(Date.now() / 1000) + 7 * 86400; // 7 days
  const tenant = await createTenant({ name: companyName, status: 'active', plan: 'trial', trialEndsAt });

  const hashed = await hashPassword(password);
  const admin = await createUserForTenant(tenant.id, {
    name,
    email,
    password: hashed,
    role: 'admin',
  });

  const token = generateToken(admin);
  return {
    user: {
      id: admin.id,
      tenantId: admin.tenantId,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isPlatformAdmin: false,
      tenantName: companyName,
    },
    token,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt,
    },
  };
}

/**
 * Second step of MFA login: verify the emailed OTP and issue the JWT.
 */
async function verifyOtp(email, otp) {
  const user = await getUserByEmail(email);
  if (!user || !user.mfaEnabled) throw new Error('MFA is not enabled for this account');

  if (!user.otpCodeHash || !user.otpExpiresAt) throw new Error('No active verification code');
  if (new Date(user.otpExpiresAt * 1000) < new Date()) throw new Error('Verification code expired');

  const provided = sha256(String(otp).trim());
  if (provided !== user.otpCodeHash) throw new Error('Invalid verification code');

  // Invalidate the OTP so it can't be replayed
  await setUserOtp(user.id, { otpCodeHash: null, otpExpiresAt: null });

  const tenant = await loadTenantFor(user);
  const token = generateToken(user);
  const { password: _password, ...userWithoutPassword } = user;
  return {
    user: {
      ...userWithoutPassword,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
      tenantName: tenant ? tenant.name : null,
    },
    token,
  };
}

/**
 * Enable MFA for the current user (email OTP). Returns the pending OTP state.
 */
async function enableMfa(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');
  if (user.mfaEnabled) throw new Error('MFA is already enabled');

  const otp = generateOtpCode();
  await setUserMfa(userId, true, {
    otpCodeHash: sha256(otp),
    otpExpiresAt: Math.floor(Date.now() / 1000) + 600,
  });
  return { enabled: true, email: user.email, otpSentTo: user.email };
}

/**
 * Disable MFA (requires the current password).
 */
async function disableMfa(userId, password) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');
  if (!comparePassword(password, user.password)) throw new Error('Current password is incorrect');
  await setUserMfa(userId, false, { otpCodeHash: null, otpExpiresAt: null });
  return { enabled: false };
}

/**
 * Send a one-time password reset link to the user's email.
 */
async function sendPasswordReset(email) {
  const user = await getUserByEmail(email);
  // Always return success to avoid user enumeration; only act if the user exists.
  if (!user) return { sent: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1h
  await createPasswordResetToken({ userId: user.id, tokenHash: sha256(rawToken), expiresAt });
  return { sent: true, user, rawToken };
}

/**
 * Reset the password using a one-time token.
 */
async function resetPassword(rawToken, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
  const record = await findValidResetToken(sha256(rawToken));
  if (!record) throw new Error('Reset link is invalid or has expired');

  const hashed = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, record.userId));
  await markResetTokenUsed(record.id);
  return { success: true };
}

/**
 * Change the current user's password (requires current password).
 */
async function changePassword(userId, currentPassword, newPassword) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');
  if (!comparePassword(currentPassword, user.password)) throw new Error('Current password is incorrect');
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const hashed = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password: hashed, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(users.id, userId));
  return { success: true };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  login,
  signup,
  verifyOtp,
  enableMfa,
  disableMfa,
  sendPasswordReset,
  resetPassword,
  changePassword,
  getUserByEmail,
  JWT_SECRET,
};
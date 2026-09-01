const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { users, tenants } = require('../db/schema');
const { eq } = require('drizzle-orm');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const JWT_EXPIRES_IN = '24h';

async function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
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

async function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

  if (!user) {
    console.warn(`[AuthService] No user found with email: "${cleanEmail}"`);
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = comparePassword(password, user.password);
  if (!isPasswordValid) {
    console.warn(`[AuthService] Password mismatch for user: ${cleanEmail}`);
    throw new Error('Invalid email or password');
  }

  // Tenant suspension is honored immediately — reject even fresh logins.
  let tenant = null;
  if (user.tenantId) {
    [tenant] = await db
      .select({ id: tenants.id, name: tenants.name, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (tenant && tenant.status === 'suspended') {
      console.warn(`[AuthService] Login rejected: tenant ${user.tenantId} is suspended`);
      throw new Error('Account access is suspended');
    }
  }

  const token = generateToken(user);

  // Don't return the password
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

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  login,
  JWT_SECRET,
};
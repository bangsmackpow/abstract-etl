const express = require('express');
const router = express.Router();
const {
  login,
  signup,
  verifyOtp,
  enableMfa,
  disableMfa,
  sendPasswordReset,
  resetPassword,
  changePassword,
  getUserByEmail,
} = require('../services/authService');
const { requireAuth } = require('../middleware/requireAuth');
const { createError } = require('../middleware/errorHandler');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /api/auth/login
 * Step 1: email + password. Returns a JWT, or { needsMfa } when MFA is enabled.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  try {
    const result = await login(email, password);

    // MFA: email the OTP before returning { needsMfa }.
    if (result.needsMfa) {
      const user = await getUserByEmail(email);
      if (user) {
        const crypto = require('crypto');
        const { setUserOtp } = require('../services/tenantRepo');
        const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
        await setUserOtp(user.id, {
          otpCodeHash: sha256(otp),
          otpExpiresAt: Math.floor(Date.now() / 1000) + 600,
        });
        await sendOtpEmail({ to: user.email, otp });
      }
      return res.json(result);
    }

    res.json(result);
  } catch (err) {
    console.error(`❌ [Auth] Login failed for: ${email} - ${err.message}`);
    throw createError(err.message, 401);
  }
});

/**
 * POST /api/auth/signup
 * Public self-serve signup — creates a tenant on a 7-day trial + admin user.
 */
router.post('/signup', async (req, res) => {
  const { companyName, name, email, password } = req.body || {};
  try {
    const result = await signup({ companyName, name, email, password });
    res.status(201).json(result);
  } catch (err) {
    throw createError(err.message, 400);
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2 (MFA): verify the emailed code and issue the JWT.
 */
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw createError('Email and verification code are required', 400);
  try {
    const result = await verifyOtp(email, otp);
    res.json(result);
  } catch (err) {
    throw createError(err.message, 401);
  }
});

/**
 * POST /api/auth/mfa/enable
 * Enables email-OTP MFA for the logged-in user (emails the initial code).
 */
router.post('/mfa/enable', requireAuth, async (req, res) => {
  const result = await enableMfa(req.user.id);
  const user = await getUserByEmail(req.user.email);
  if (user) {
    const crypto = require('crypto');
    const { setUserOtp } = require('../services/tenantRepo');
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
    await setUserOtp(user.id, {
      otpCodeHash: sha256(otp),
      otpExpiresAt: Math.floor(Date.now() / 1000) + 600,
    });
    await sendOtpEmail({ to: user.email, otp });
  }
  res.json({ ...result, otpSentTo: req.user.email });
});

/**
 * POST /api/auth/mfa/disable
 * Disables MFA (requires current password).
 */
router.post('/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) throw createError('Current password is required', 400);
  try {
    const result = await disableMfa(req.user.id, password);
    res.json(result);
  } catch (err) {
    throw createError(err.message, 400);
  }
});

/**
 * POST /api/auth/forgot-password
 * Emails a one-time reset link. Always returns success (no enumeration).
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) throw createError('Email is required', 400);
  const result = await sendPasswordReset(email);
  if (result.rawToken && result.user) {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${result.rawToken}`;
    await sendPasswordResetEmail({ to: result.user.email, resetUrl });
  }
  res.json({ sent: true });
});

/**
 * POST /api/auth/reset-password
 * Completes a password reset with the one-time token.
 */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw createError('Token and new password are required', 400);
  try {
    const result = await resetPassword(token, password);
    res.json(result);
  } catch (err) {
    throw createError(err.message, 400);
  }
});

/**
 * PATCH /api/auth/password
 * Change the logged-in user's password (requires current password).
 */
router.patch('/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    throw createError('Current and new password are required', 400);
  }
  try {
    const result = await changePassword(req.user.id, current_password, new_password);
    res.json(result);
  } catch (err) {
    throw createError(err.message, 400);
  }
});

module.exports = router;
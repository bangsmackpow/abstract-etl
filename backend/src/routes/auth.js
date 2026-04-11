const express = require('express');
const router = express.Router();
const { login } = require('../services/authService');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/login
 * Standard login route.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  console.log(`[Auth] Login attempt for email: ${email} (Password length: ${password?.length || 0})`);

  try {
    const result = await login(email, password);
    console.log(`✅ [Auth] Login successful for: ${email}`);
    res.json(result);
  } catch (err) {
    console.error(`❌ [Auth] Login failed for: ${email} - ${err.message}`);
    throw createError(err.message, 401);
  }
});

module.exports = router;

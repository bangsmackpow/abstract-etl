const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Cloudflare → nginx proxy manager → frontend nginx → this app.
// Trust the proxy chain so req.ip is the real client (required for
// per-IP rate limiting to work at all).
const trustProxy = () => true;

// Generic auth limiter: per-IP, generous enough for normal use.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: true, message: 'Too many attempts. Please try again in a few minutes.' },
});

// Login: per-IP AND per-email so one attacker can't brute-force one account
// across many IPs, nor lock out a whole office behind one IP too easily.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    return email ? `${ipKeyGenerator(req.ip)}:${email}` : ipKeyGenerator(req.ip);
  },
  message: { error: true, message: 'Too many login attempts. Please try again in a few minutes.' },
});

// OTP verification: 6-digit codes get 5 tries per account per 10 minutes.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    return email ? `${ipKeyGenerator(req.ip)}:${email}` : ipKeyGenerator(req.ip);
  },
  message: { error: true, message: 'Too many verification attempts. Request a new code in a few minutes.' },
});

// Public signup: 5 trials per IP per hour (anti trial-farming).
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: true, message: 'Too many signups from this network. Try again later.' },
});

// Forgot-password: 5 emails per IP per 15 minutes (anti email-bombing).
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: true, message: 'Too many reset requests. Please try again later.' },
});

module.exports = { trustProxy, authLimiter, loginLimiter, otpLimiter, signupLimiter, forgotLimiter };

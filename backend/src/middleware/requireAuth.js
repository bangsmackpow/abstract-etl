const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/authService');
const { db } = require('../db');
const { users, tenants } = require('../db/schema');
const { eq } = require('drizzle-orm');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ error: true, message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Verify user still exists in DB
      const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

      if (!user) {
        return res.status(401).json({ error: true, message: 'User not found' });
      }

      // Tenant suspension is honored immediately — reject at auth time.
      if (user.tenantId) {
        const [tenant] = await db
          .select({ status: tenants.status })
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1);
        if (tenant && tenant.status === 'suspended') {
          return res.status(403).json({ error: true, message: 'Account access is suspended' });
        }
      }

      req.user = user;
      req.tenantId = user.tenantId || null;
      next();
    } catch (err) {
      console.error('[requireAuth] JWT Verify Error:', err.message);
      return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }
  } catch (err) {
    console.error('[requireAuth] General Error:', err.message);
    return res.status(401).json({ error: true, message: 'Authentication failed' });
  }
}

/**
 * Tenant admin: manages their own tenant's users, jobs, metrics.
 * The existing seeded admin (ADMIN_EMAIL) holds this role for the default tenant.
 */
function requireTenantAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: true, message: 'Tenant admin access required' });
}

/**
 * Platform super-admin: provision/suspend tenants, global settings, backups.
 * Only users with is_platform_admin=true pass. A tenant admin (role='admin')
 * alone is NOT sufficient — platform powers are separate from tenant admin.
 */
function requirePlatformAdmin(req, res, next) {
  if (req.user && Boolean(req.user.isPlatformAdmin)) return next();
  return res.status(403).json({ error: true, message: 'Platform admin access required' });
}

/**
 * Blocks AI extraction for tenants whose trial expired and who have no active
 * subscription. Logins still work (Track 4 decision). Used on extract routes.
 */
async function requireActiveTrialOrSubscription(req, res, next) {
  try {
    if (!req.tenantId) return next();
    const [tenant] = await db
      .select({ plan: tenants.plan, trialEndsAt: tenants.trialEndsAt, subscriptionStatus: tenants.subscriptionStatus })
      .from(tenants)
      .where(eq(tenants.id, req.tenantId))
      .limit(1);
    if (!tenant) return next();

    const trialActive = tenant.plan === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt * 1000 > Date.now();
    const subActive = (tenant.subscriptionStatus || 'none') === 'active';
    if (trialActive || subActive || tenant.plan === 'enterprise') return next();

    return res.status(402).json({
      error: true,
      message: 'Your free trial has ended. Please subscribe to continue generating abstracts.',
      code: 'trial_expired',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, requireTenantAdmin, requirePlatformAdmin, requireActiveTrialOrSubscription };
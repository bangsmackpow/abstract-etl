const express = require('express');
const router = express.Router();
const { requireAuth, requirePlatformAdmin } = require('../middleware/requireAuth');
const { createError } = require('../middleware/errorHandler');
const { hashPassword } = require('../services/authService');
const {
  listTenants,
  createTenant,
  setTenantStatus,
  getTenantBySlug,
  createUserForTenant,
} = require('../services/tenantRepo');

router.use(requireAuth);
router.use(requirePlatformAdmin);

// GET /api/platform/tenants — list all tenants
router.get('/tenants', async (req, res) => {
  const tenants = await listTenants();
  res.json(tenants);
});

// POST /api/platform/tenants — create a tenant (+ optional initial admin user)
router.post('/tenants', async (req, res) => {
  const { name, slug, adminName, adminEmail, adminPassword } = req.body || {};

  if (!name) {
    throw createError('Tenant name is required', 400);
  }

  let normalizedSlug = null;
  if (slug) {
    normalizedSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await getTenantBySlug(normalizedSlug);
    if (existing) {
      throw createError('Tenant slug already exists', 400);
    }
  }

  const tenant = await createTenant({ name, slug: normalizedSlug });

  // Optional: seed an initial tenant admin user
  if (adminEmail && adminPassword) {
    const hashedPassword = await hashPassword(adminPassword);
    try {
      await createUserForTenant(tenant.id, {
        name: adminName || adminEmail,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      });
    } catch (err) {
      // Roll back the tenant if user seeding fails (e.g. duplicate email)
      const { setTenantStatus } = require('../services/tenantRepo');
      await setTenantStatus(tenant.id, 'suspended');
      throw createError(`Tenant created but admin user failed: ${err.message}`, 400);
    }
  }

  res.status(201).json(tenant);
});

// PATCH /api/platform/tenants/:id — suspend or reactivate a tenant
router.patch('/tenants/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) {
    throw createError('Status must be "active" or "suspended"', 400);
  }

  const tenant = await setTenantStatus(req.params.id, status);
  if (!tenant) {
    throw createError('Tenant not found', 404);
  }

  res.json(tenant);
});

module.exports = router;
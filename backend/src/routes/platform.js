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
  getTenantById,
  createUserForTenant,
  listJobsForTenant,
  moveJobToTenant,
  createAuditLog,
  listAuditLog,
  listTenantSettings,
  setTenantSettings,
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

// GET /api/platform/tenants/:id/jobs — list a tenant's jobs (drill-down)
router.get('/tenants/:id/jobs', async (req, res) => {
  const tenant = await getTenantById(req.params.id);
  if (!tenant) throw createError('Tenant not found', 404);

  const { search, status, page, perPage } = req.query;
  const result = await listJobsForTenant(req.params.id, { search, status, page, perPage });
  res.json(result);
});

// GET /api/platform/tenants/:id/settings — read a tenant's settings
router.get('/tenants/:id/settings', async (req, res) => {
  const tenant = await getTenantById(req.params.id);
  if (!tenant) throw createError('Tenant not found', 404);
  res.json(await listTenantSettings(req.params.id));
});

// PATCH /api/platform/tenants/:id/settings — edit a tenant's settings
router.patch('/tenants/:id/settings', async (req, res) => {
  const tenant = await getTenantById(req.params.id);
  if (!tenant) throw createError('Tenant not found', 404);
  res.json(await setTenantSettings(req.params.id, req.body || {}));
});

// POST /api/platform/jobs/:id/move — move a job to another tenant
router.post('/jobs/:id/move', async (req, res) => {
  const { toTenantId } = req.body || {};
  if (!toTenantId) throw createError('toTenantId is required', 400);

  const result = await moveJobToTenant(req.params.id, toTenantId);
  if (result.error === 'job_not_found') throw createError('Job not found', 404);
  if (result.error === 'tenant_not_found') throw createError('Destination tenant not found', 404);
  if (result.error === 'same_tenant') throw createError('Job is already in that tenant', 400);
  if (result.error === 'no_destination_admin') {
    throw createError('Destination tenant has no admin user to reassign the job to', 400);
  }

  await createAuditLog({
    actorUserId: req.user.id,
    action: 'job.move',
    targetType: 'job',
    targetId: req.params.id,
    fromTenantId: result.fromTenantId,
    toTenantId: result.toTenantId,
    details: JSON.stringify({ propertyAddress: result.job.propertyAddress, destAdminId: result.destAdminId }),
  });

  res.json({ success: true, job: result.job });
});

// GET /api/platform/audit — recent privileged-op history
router.get('/audit', async (req, res) => {
  const limit = req.query.limit;
  const entries = await listAuditLog(limit);
  res.json(entries);
});

module.exports = router;
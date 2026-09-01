const express = require('express');
const router = express.Router();
const { requireAuth, requireTenantAdmin } = require('../middleware/requireAuth');
const { sendCompletionEmail } = require('../services/emailService');
const { createError } = require('../middleware/errorHandler');
const {
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  setJobEmailSent,
  listUsersByTenant,
  getUserByTenant,
} = require('../services/tenantRepo');

// All job routes require auth
router.use(requireAuth);

// GET /api/jobs/admin/users — tenant admin: list this tenant's users for filter dropdown
router.get('/admin/users', requireTenantAdmin, async (req, res) => {
  const allUsers = await listUsersByTenant(req.tenantId);
  res.json(allUsers);
});

// GET /api/jobs — list jobs (tenant-scoped; tenant admin may filter by user)
router.get('/', async (req, res) => {
  const { search, status, page = 1, perPage = 25, userId } = req.query;

  // Tenant admin may filter by user; abstractors always see only their own
  const effectiveUserId = req.user.role === 'admin' ? userId : req.user.id;

  const result = await listJobs(req.tenantId, {
    search,
    status,
    userId: effectiveUserId,
    page,
    perPage,
  });

  res.json(result);
});

// GET /api/jobs/:id — get single job (tenant-scoped, 404 for foreign tenant)
router.get('/:id', async (req, res) => {
  const record = await getJob(req.tenantId, req.params.id);

  if (!record) {
    throw createError('Not found', 404);
  }

  // Abstractors can only see their own jobs
  if (req.user.role !== 'admin' && record.createdBy !== req.user.id) {
    throw createError('Not found', 404);
  }

  res.json(record);
});

// POST /api/jobs — create new job (called after extraction)
router.post('/', async (req, res) => {
  const {
    property_address,
    borrower_names,
    county,
    order_date,
    fields_json,
    ai_flags_json,
    processing_time_ms,
    template_version,
  } = req.body;

  const record = await createJob(req.tenantId, {
    createdBy: req.user.id,
    propertyAddress: property_address,
    borrowerNames: borrower_names,
    county,
    orderDate: order_date,
    fieldsJson: fields_json,
    aiFlagsJson: ai_flags_json,
    templateVersion: template_version,
    processingTimeMs: processing_time_ms,
  });

  res.status(201).json(record);
});

// PATCH /api/jobs/:id — update fields, status, notes (tenant-scoped)
router.patch('/:id', async (req, res) => {
  const existing = await getJob(req.tenantId, req.params.id);

  if (!existing) {
    throw createError('Not found', 404);
  }

  if (req.user.role !== 'admin' && existing.createdBy !== req.user.id) {
    throw createError('Not found', 404);
  }

  const updates = {};
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.property_address !== undefined) updates.propertyAddress = req.body.property_address;
  if (req.body.borrower_names !== undefined) updates.borrowerNames = req.body.borrower_names;
  if (req.body.county !== undefined) updates.county = req.body.county;
  if (req.body.order_date !== undefined) updates.orderDate = req.body.order_date;
  if (req.body.fields_json !== undefined) updates.fieldsJson = req.body.fields_json;
  if (req.body.ai_flags_json !== undefined) updates.aiFlagsJson = req.body.ai_flags_json;
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

  const updated = await updateJob(req.tenantId, req.params.id, updates);

  // Send completion email if status just became 'complete' and not yet sent
  if (updates.status === 'complete' && !existing.emailSent) {
    const user = await getUserByTenant(req.tenantId, existing.createdBy);
    if (user) {
      const sent = await sendCompletionEmail({
        to: user.email,
        abstractorName: user.name,
        propertyAddress: updated.propertyAddress,
        jobId: updated.id,
        appUrl: process.env.APP_URL,
      });
      if (sent) {
        await setJobEmailSent(req.tenantId, req.params.id);
      }
    }
  }

  res.json(updated);
});

// DELETE /api/jobs/:id — tenant admin only (tenant-scoped; 404 for foreign tenant)
router.delete('/:id', requireTenantAdmin, async (req, res) => {
  const existing = await getJob(req.tenantId, req.params.id);
  if (!existing) {
    throw createError('Not found', 404);
  }
  await deleteJob(req.tenantId, req.params.id);
  res.json({ success: true });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { jobs, users } = require('../db/schema');
const { eq, and, or, like, desc, sql } = require('drizzle-orm');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');
const { sendCompletionEmail } = require('../services/emailService');
const { createError } = require('../middleware/errorHandler');

// All job routes require auth
router.use(requireAuth);

// GET /api/jobs/admin/users — admin: list all users for filter dropdown
router.get('/admin/users', requireAdmin, async (req, res) => {
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role
  }).from(users);
  res.json(allUsers);
});

// GET /api/jobs — list jobs (own jobs; admin sees all)
router.get('/', async (req, res) => {
  const { search, status, page = 1, perPage = 25, userId } = req.query;

  const offset = (Number(page) - 1) * Number(perPage);
  const limit = Number(perPage);

  const filters = [];
  if (req.user.role !== 'admin') {
    filters.push(eq(jobs.createdBy, req.user.id));
  } else if (userId) {
    filters.push(eq(jobs.createdBy, userId));
  }
  
  if (status) {
    filters.push(eq(jobs.status, status));
  }
  
  if (search) {
    filters.push(or(
      like(jobs.propertyAddress, `%${search}%`),
      like(jobs.borrowerNames, `%${search}%`),
      like(jobs.county, `%${search}%`)
    ));
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const records = await db.select().from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await db.select({ 
    count: sql`count(*)` 
  }).from(jobs).where(whereClause);

  res.json({
    items: records,
    page: Number(page),
    perPage: Number(perPage),
    totalItems: Number(countResult.count),
    totalPages: Math.ceil(Number(countResult.count) / limit)
  });
});

// GET /api/jobs/:id — get single job
router.get('/:id', async (req, res) => {
  const [record] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);

  if (!record) {
    throw createError('Not found', 404);
  }

  // Non-admins can only see their own jobs
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
    processing_time_ms 
  } = req.body;

  // Allow empty address on creation, default to PENDING so job can still be saved
  const finalAddress = property_address || 'PENDING ADDRESS';

  const [record] = await db.insert(jobs).values({
    createdBy: req.user.id,
    status: 'draft',
    propertyAddress: finalAddress,
    borrowerNames: borrower_names || '',
    county: county || '',
    orderDate: order_date || null,
    fieldsJson: fields_json || {},
    aiFlagsJson: ai_flags_json || {},
    templateVersion: 'v1',
    emailSent: false,
    notes: '',
    processingTimeMs: processing_time_ms || null
  }).returning();

  res.status(201).json(record);
});

// PATCH /api/jobs/:id — update fields, status, notes
router.patch('/:id', async (req, res) => {
  const [existing] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);

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
  
  updates.updatedAt = sql`(strftime('%s', 'now'))`;

  const [updated] = await db.update(jobs)
    .set(updates)
    .where(eq(jobs.id, req.params.id))
    .returning();

  // Send completion email if status just became 'complete' and not yet sent
  if (updates.status === 'complete' && !existing.emailSent) {
    const [user] = await db.select().from(users).where(eq(users.id, existing.createdBy)).limit(1);
    if (user) {
      const sent = await sendCompletionEmail({
        to: user.email,
        abstractorName: user.name,
        propertyAddress: updated.propertyAddress,
        jobId: updated.id,
        appUrl: process.env.APP_URL
      });
      if (sent) {
        await db.update(jobs).set({ emailSent: true }).where(eq(jobs.id, req.params.id));
      }
    }
  }

  res.json(updated);
});

// DELETE /api/jobs/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  await db.delete(jobs).where(eq(jobs.id, req.params.id));
  res.json({ success: true });
});

module.exports = router;

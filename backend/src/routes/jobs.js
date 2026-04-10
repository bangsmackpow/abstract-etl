const express       = require('express');
const router        = express.Router();
const pb            = require('../services/pocketbaseClient');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');
const { sendCompletionEmail }       = require('../services/emailService');
const { createError } = require('../middleware/errorHandler');

// All job routes require auth
router.use(requireAuth);

// GET /api/jobs/admin/users — admin: list all users for filter dropdown
router.get('/admin/users', requireAdmin, async (req, res) => {
  const users = await pb.collection('users').getFullList({
    fields: 'id,name,email,role'
  });
  res.json(users);
});

// GET /api/jobs — list jobs (own jobs; admin sees all)
router.get('/', async (req, res) => {
  const { search, status, page = 1, perPage = 25 } = req.query;

  const filters = [];
  if (req.user.role !== 'admin') {
    filters.push(`created_by = "${req.user.id}"`);
  } else if (req.query.userId) {
    filters.push(`created_by = "${req.query.userId}"`);
  }
  if (status) filters.push(`status = "${status}"`);
  if (search) {
    // Escape double quotes for PocketBase filter
    const escaped = search.replace(/"/g, '\\"');
    filters.push(`(property_address ~ "${escaped}" || borrower_names ~ "${escaped}" || county ~ "${escaped}")`);
  }

  const filter  = filters.length > 0 ? filters.join(' && ') : null;
  console.log(`[Jobs] Fetching jobs for user=${req.user.id} role=${req.user.role} filter="${filter || 'none'}"`);
  
  try {
    const options = {
      sort:   '-created',
    };
    if (filter) options.filter = filter;

    const records = await pb.collection('jobs').getList(Number(page), Number(perPage), options);
    res.json(records);
  } catch (err) {
    console.error('[Jobs] PB Error:', err.status, err.message, JSON.stringify(err.data));
    throw err;
  }
});

// GET /api/jobs/:id — get single job
router.get('/:id', async (req, res) => {
  const record = await pb.collection('jobs').getOne(req.params.id);

  // Non-admins can only see their own jobs
  if (req.user.role !== 'admin' && record.created_by !== req.user.id) {
    throw createError('Not found', 404);
  }

  res.json(record);
});

// POST /api/jobs — create new job (called after extraction)
router.post('/', async (req, res) => {
  const { property_address, borrower_names, county, order_date, fields_json, ai_flags_json } = req.body;

  if (!property_address) throw createError('property_address is required');

  const record = await pb.collection('jobs').create({
    created_by:      req.user.id,
    status:          'draft',
    property_address,
    borrower_names:  borrower_names  || '',
    county:          county          || '',
    order_date:      order_date      || null,
    fields_json:     fields_json     || {},
    ai_flags_json:   ai_flags_json   || {},
    template_version:'v1',
    email_sent:      false,
    notes:           ''
  });

  res.status(201).json(record);
});

// PATCH /api/jobs/:id — update fields, status, notes
router.patch('/:id', async (req, res) => {
  const existing = await pb.collection('jobs').getOne(req.params.id);

  if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
    throw createError('Not found', 404);
  }

  const allowedFields = [
    'status', 'property_address', 'borrower_names', 'county',
    'order_date', 'fields_json', 'ai_flags_json', 'notes'
  ];
  const updates = {};
  allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await pb.collection('jobs').update(req.params.id, updates);

  // Send completion email if status just became 'complete' and not yet sent
  if (updates.status === 'complete' && !existing.email_sent) {
    const user = await pb.collection('users').getOne(existing.created_by);
    const sent = await sendCompletionEmail({
      to:              user.email,
      abstractorName:  user.name,
      propertyAddress: updated.property_address,
      jobId:           updated.id,
      appUrl:          process.env.APP_URL
    });
    if (sent) await pb.collection('jobs').update(req.params.id, { email_sent: true });
  }

  res.json(updated);
});

// DELETE /api/jobs/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  await pb.collection('jobs').delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;

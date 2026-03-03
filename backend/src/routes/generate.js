const express  = require('express');
const router   = express.Router();
const { requireAuth }    = require('../middleware/requireAuth');
const { generateDocx }   = require('../services/docxGenerator');
const pb                 = require('../services/pocketbaseClient');
const { createError }    = require('../middleware/errorHandler');

router.use(requireAuth);

/**
 * GET /api/generate/:jobId
 * Generates and downloads a .docx for the given job.
 */
router.get('/:jobId', async (req, res) => {
  const job = await pb.collection('jobs').getOne(req.params.jobId);

  if (req.user.role !== 'admin' && job.created_by !== req.user.id) {
    throw createError('Not found', 404);
  }

  const fields = job.fields_json || {};
  const buffer = await generateDocx(fields);

  // Sanitize address for filename
  const addr     = (fields.property_address || job.property_address || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 60);
  const filename = `abstract_${addr}.docx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

module.exports = router;

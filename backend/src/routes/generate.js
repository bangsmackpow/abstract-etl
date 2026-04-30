const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { jobs } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { requireAuth } = require('../middleware/requireAuth');
const { generateDocx } = require('../services/docxGenerator');
const { generateMarkdown } = require('../services/markdownGenerator');
const { generateV2Report } = require('../services/pdfGenerator');
const { createError } = require('../middleware/errorHandler');

router.use(requireAuth);

/**
 * GET /api/generate/:jobId/pdf
 * Generates and downloads a .pdf for a v2 job.
 */
router.get('/:jobId/pdf', async (req, res, next) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);

    if (!job) return next(createError('Not found', 404));
    if (req.user.role !== 'admin' && job.createdBy !== req.user.id) return next(createError('Not found', 404));

    // This route is for V2 jobs only
    if (job.templateVersion !== 'v2') {
        return next(createError('PDF export is only available for V2 jobs.', 400));
    }

    const tempPath = `/tmp/report-${job.id}.pdf`;
    await generateV2Report(job, tempPath);
    
    res.download(tempPath, `report_${job.id}.pdf`, (err) => {
        // Cleanup temp file
        if (require('fs').existsSync(tempPath)) {
            require('fs').unlinkSync(tempPath);
        }
    });
});

/**
 * GET /api/generate/:jobId
 * Generates and downloads a .docx for the given job.
 */
router.get('/:jobId', async (req, res) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);

  if (!job) {
    throw createError('Not found', 404);
  }

  if (req.user.role !== 'admin' && job.createdBy !== req.user.id) {
    throw createError('Not found', 404);
  }

  const fields = job.fieldsJson || {};
  const buffer = await generateDocx(fields);

  // Sanitize address for filename
  const addr = (job.propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 60);
  const filename = `abstract_${addr}.docx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * GET /api/generate/:jobId/markdown
 * Generates and downloads a .md for the given job.
 */
router.get('/:jobId/markdown', async (req, res) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);

  if (!job) {
    throw createError('Not found', 404);
  }

  if (req.user.role !== 'admin' && job.createdBy !== req.user.id) {
    throw createError('Not found', 404);
  }

  const fields = job.fieldsJson || {};
  const mdContent = generateMarkdown(fields);

  const addr = (job.propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 60);
  const filename = `abstract_${addr}.md`;

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(mdContent);
});

module.exports = router;

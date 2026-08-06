const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { jobs } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { requireAuth } = require('../middleware/requireAuth');
const { generateV7TextDocx, generateV7TableDocx } = require('../services/v7DocxGenerator');
const { generateV7Markdown } = require('../services/v7MarkdownGenerator');
const { generateV7Report } = require('../services/v7PdfGenerator');
const { createError } = require('../middleware/errorHandler');

router.use(requireAuth);

/**
 * GET /api/generate/:jobId/pdf
 * Generates and downloads the v7 PDF report.
 */
router.get('/:jobId/pdf', async (req, res, next) => {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);

    if (!job) return next(createError('Not found', 404));
    if (req.user.role !== 'admin' && job.createdBy !== req.user.id) return next(createError('Not found', 404));

    const tempPath = `/tmp/report-${job.id}.pdf`;

    await generateV7Report(job, tempPath);

    res.download(tempPath, `report_${job.id}.pdf`, (_err) => {
        // Cleanup temp file
        if (require('fs').existsSync(tempPath)) {
            require('fs').unlinkSync(tempPath);
        }
    });
});

/**
 * GET /api/generate/:jobId/docx-text
 * Generates and downloads a v7 text-format .docx.
 */
router.get('/:jobId/docx-text', async (req, res, next) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);
  if (!job) return next(createError('Not found', 404));
  if (req.user.role !== 'admin' && job.createdBy !== req.user.id) return next(createError('Not found', 404));
  const fields = job.fieldsJson || {};
  const buffer = await generateV7TextDocx(fields);
  const addr = (job.propertyAddress || 'abstract').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').toLowerCase().substring(0, 60);
  const filename = `abstract_text_${addr}.docx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * GET /api/generate/:jobId/docx-table
 * Generates and downloads a v7 table-format .docx.
 */
router.get('/:jobId/docx-table', async (req, res, next) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);
  if (!job) return next(createError('Not found', 404));
  if (req.user.role !== 'admin' && job.createdBy !== req.user.id) return next(createError('Not found', 404));
  const fields = job.fieldsJson || {};
  const buffer = await generateV7TableDocx(fields);
  const addr = (job.propertyAddress || 'abstract').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').toLowerCase().substring(0, 60);
  const filename = `abstract_table_${addr}.docx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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
  const mdContent = generateV7Markdown(fields);

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

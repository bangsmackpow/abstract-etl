const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { generateV7TextDocx, generateV7TableDocx } = require('../services/v7DocxGenerator');
const { generateV7Markdown } = require('../services/v7MarkdownGenerator');
const { generateV7Report } = require('../services/v7PdfGenerator');
const { generateV9TextDocx, generateV9TableDocx } = require('../services/v9DocxGenerator');
const { generateV9Markdown } = require('../services/v9MarkdownGenerator');
const { generateV9Report } = require('../services/v9PdfGenerator');
const { createError } = require('../middleware/errorHandler');
const { getJob, getTenantLogo } = require('../services/tenantRepo');

router.use(requireAuth);

/**
 * Loads a job tenant-scoped. Returns 404 for a foreign tenant's ID so
 * cross-tenant IDs never reveal existence (multi-tenant-plan.md §5.2).
 * Also loads the job's tenant logo (if set) for report rendering.
 */
async function loadTenantJob(req, res, next) {
  const job = await getJob(req.tenantId, req.params.jobId);
  if (!job) return next(createError('Not found', 404));
  // Abstractors can only render their own jobs
  if (req.user.role !== 'admin' && job.createdBy !== req.user.id) {
    return next(createError('Not found', 404));
  }
  const tenantLogo = await getTenantLogo(req.tenantId);
  const logo = tenantLogo
    ? { data: Buffer.from(tenantLogo.blob, 'base64'), mime: tenantLogo.mime }
    : null;
  req.job = job;
  req.logo = logo;
  next();
}

// Version-aware generator selection: jobs extracted/created with templateVersion
// 'v7' render with the legacy V7 generators; everything else uses V9 rules.
function generatorsFor(job) {
  const v = job.templateVersion;
  if (v === 'v7') {
    return {
      text: generateV7TextDocx,
      table: generateV7TableDocx,
      markdown: generateV7Markdown,
      pdf: generateV7Report,
    };
  }
  return {
    text: generateV9TextDocx,
    table: generateV9TableDocx,
    markdown: generateV9Markdown,
    pdf: generateV9Report,
  };
}

/**
 * GET /api/generate/:jobId/pdf
 * Generates and downloads the PDF report (v7 or v9 per job templateVersion).
 */
router.get('/:jobId/pdf', loadTenantJob, async (req, res, _next) => {
    const job = req.job;
    const gens = generatorsFor(job);

    const tempPath = `/tmp/report-${job.id}.pdf`;

    await gens.pdf(job, tempPath, { logo: req.logo });

    res.download(tempPath, `report_${job.id}.pdf`, (_err) => {
        // Cleanup temp file
        if (require('fs').existsSync(tempPath)) {
            require('fs').unlinkSync(tempPath);
        }
    });
});

/**
 * GET /api/generate/:jobId/docx-text
 * Generates and downloads a text-format .docx (v7 or v9 per job).
 */
router.get('/:jobId/docx-text', loadTenantJob, async (req, res, _next) => {
  const job = req.job;
  const gens = generatorsFor(job);
  const fields = job.fieldsJson || {};
  const buffer = await gens.text(fields, { logo: req.logo });
  const addr = (job.propertyAddress || 'abstract').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').toLowerCase().substring(0, 60);
  const filename = `abstract_text_${addr}.docx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * GET /api/generate/:jobId/docx-table
 * Generates and downloads a table-format .docx (v7 or v9 per job).
 */
router.get('/:jobId/docx-table', loadTenantJob, async (req, res, _next) => {
  const job = req.job;
  const gens = generatorsFor(job);
  const fields = job.fieldsJson || {};
  const buffer = await gens.table(fields, { logo: req.logo });
  const addr = (job.propertyAddress || 'abstract').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').toLowerCase().substring(0, 60);
  const filename = `abstract_table_${addr}.docx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

/**
 * GET /api/generate/:jobId/markdown
 * Generates and downloads a .md for the given job (v7 or v9 per job).
 */
router.get('/:jobId/markdown', loadTenantJob, async (req, res) => {
  const job = req.job;
  const gens = generatorsFor(job);
  const fields = job.fieldsJson || {};
  const mdContent = gens.markdown(fields);

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
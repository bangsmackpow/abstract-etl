const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireActiveTrialOrSubscription } = require('../middleware/requireAuth');
const googleAiService = require('../services/googleAiService');
const { withExtractionConcurrency } = require('../services/extractionQueue');
const { sendBulkImportNotification } = require('../services/emailService');
const { createError } = require('../middleware/errorHandler');
const { createJob, getTenantSetting } = require('../services/tenantRepo');

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
});

router.use(requireAuth);

router.post('/', requireActiveTrialOrSubscription, upload.single('pdf'), async (req, res) => {
  if (!req.file) throw createError('No PDF file provided');

  const pdfPath = req.file.path;
  const startTime = Date.now();
  const templateVersion = req.body.template_version === 'v7' ? 'v7' : 'v9';

  try {
    const filename = req.file.originalname || '';
    const extractedFields = await withExtractionConcurrency(() =>
      googleAiService.extractFromPDF(pdfPath, filename, templateVersion)
    );
    const processingTimeMs = Date.now() - startTime;

    const aiFlags = {};
    function flagFields(obj, prefix = '') {
      if (!obj) return;
      Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item, i) => {
            if (typeof item === 'object' && item !== null) {
              flagFields(item, `${fullKey}[${i}]`);
            } else {
              aiFlags[`${fullKey}[${i}]`] = 'ai';
            }
          });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          flagFields(obj[key], fullKey);
        } else if (obj[key] !== null) {
          aiFlags[fullKey] = 'ai';
        }
      });
    }
    flagFields(extractedFields);

    res.json({
      fields: extractedFields,
      aiFlags,
      filename: req.file.originalname,
      processingTimeMs,
      templateVersion,
    });
  } catch (err) {
    console.error('Extract failed:', err);
    throw createError(`AI Extraction Failed: ${err.message}`, 500);
  } finally {
    try {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } catch { /* ignore */ }
  }
});

router.post('/bulk', requireActiveTrialOrSubscription, upload.array('pdfs', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw createError('No PDF files provided');
  }

  const results = [];
  const templateVersion = req.body.template_version === 'v7' ? 'v7' : 'v9';

  for (const file of req.files) {
    const pdfPath = file.path;
    try {
      const extractedFields = await withExtractionConcurrency(() =>
        googleAiService.extractFromPDF(pdfPath, file.originalname, templateVersion)
      );
      const oi = extractedFields.order_info || {};
      const propertyAddress = oi.property_address || '';

      const job = await createJob(req.tenantId, {
        createdBy: req.user.id,
        propertyAddress: propertyAddress || 'PENDING ADDRESS',
        borrowerNames: oi.borrower_owner || '',
        county: oi.county || '',
        fieldsJson: extractedFields,
        templateVersion,
        notes: '',
      });

      results.push({
        filename: file.originalname,
        status: 'created',
        jobId: job.id,
        propertyAddress,
        templateVersion,
      });
    } catch (err) {
      console.error(`Bulk import failed for ${file.originalname}:`, err.message);
      results.push({
        filename: file.originalname,
        status: 'failed',
        error: err.message,
      });
    } finally {
      try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch { /* ignore */ }
    }
  }

  // Honor tenant settings: notification_email destination + bulk email toggle.
  // (Never the platform ADMIN_EMAIL — that leaked other tenants' activity.)
  const bulkEmailsEnabled = (await getTenantSetting(req.tenantId, 'enable_bulk_import_emails')) !== 'false';
  let mailSent = false;
  if (bulkEmailsEnabled) {
    const notifyEmail = (await getTenantSetting(req.tenantId, 'notification_email')) || req.user.email;
    if (notifyEmail) {
      mailSent = await sendBulkImportNotification({ to: notifyEmail, results });
    }
  }

  res.json({ results, notificationSent: mailSent });
});

module.exports = router;

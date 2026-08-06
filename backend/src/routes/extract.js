const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/requireAuth');
const googleAiService = require('../services/googleAiService');
const { sendBulkImportNotification } = require('../services/emailService');
const { createError } = require('../middleware/errorHandler');
const { db } = require('../db');
const { jobs } = require('../db/schema');

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
});

router.use(requireAuth);

router.post('/', upload.single('pdf'), async (req, res) => {
  if (!req.file) throw createError('No PDF file provided');

  const pdfPath = req.file.path;
  const startTime = Date.now();

  try {
    const filename = req.file.originalname || '';
    const extractedFields = await googleAiService.extractFromPDF(pdfPath, filename);
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

router.post('/bulk', upload.array('pdfs', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw createError('No PDF files provided');
  }

  const results = [];

  for (const file of req.files) {
    const pdfPath = file.path;
    try {
      const extractedFields = await googleAiService.extractFromPDF(pdfPath, file.originalname);
      const oi = extractedFields.order_info || {};
      const propertyAddress = oi.property_address || '';

      const [job] = await db
        .insert(jobs)
        .values({
          createdBy: req.user.id,
          status: 'draft',
          propertyAddress: propertyAddress || 'PENDING ADDRESS',
          borrowerNames: oi.borrower_owner || '',
          county: oi.county || '',
          fieldsJson: extractedFields,
          templateVersion: 'v7',
          emailSent: false,
          notes: '',
        })
        .returning();

      results.push({
        filename: file.originalname,
        status: 'created',
        jobId: job.id,
        propertyAddress,
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

  const adminEmail = process.env.ADMIN_EMAIL;
  const mailSent = await sendBulkImportNotification({
    to: req.user.email || adminEmail,
    results,
  });

  res.json({ results, notificationSent: mailSent });
});

module.exports = router;

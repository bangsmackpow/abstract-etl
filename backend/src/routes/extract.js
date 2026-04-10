const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth }    = require('../middleware/requireAuth');
const { extractFromPDF } = require('../services/aiService');
const { createError }    = require('../middleware/errorHandler');

// Multer: accept PDFs up to 50MB, stored in uploads/
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  }
});

router.use(requireAuth);

/**
 * POST /api/extract
 * Accepts a PDF upload, runs Gemini extraction, returns extracted fields JSON.
 * Does NOT create the job record — that's done by the frontend after user review.
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  if (!req.file) throw createError('No PDF file provided');

  const pdfPath = req.file.path;
  const tempDir = path.join(__dirname, '../uploads', uuidv4());
  fs.mkdirSync(tempDir, { recursive: true });

  const startTime = Date.now();

  try {
    const extractedFields = await extractFromPDF(pdfPath, tempDir);
    const processingTimeMs = Date.now() - startTime;

    // Build ai_flags_json — mark all returned fields as 'ai'
    const aiFlags = {};
    function flagFields(obj, prefix = '') {
      if (!obj) return;
      Object.keys(obj).forEach(key => {
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
      fields:   extractedFields,
      aiFlags,
      filename: req.file.originalname,
      processingTimeMs
    });
  } finally {
    // Clean up temp files
    try {
      fs.unlinkSync(pdfPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) { /* ignore cleanup errors */ }
  }
});

module.exports = router;

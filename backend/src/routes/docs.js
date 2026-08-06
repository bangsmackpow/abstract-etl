const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const DOCS_DIR = process.env.DOCS_DIR || path.join(__dirname, '..', '..', '..', 'docs');

// ── GET /api/docs/rules — current rules.md ───────────────────────────────────
router.get('/rules', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'rules.md'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Rules file not found' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/rules.md' });
});

// ── GET /api/docs/prompts/v7 — current v7 prompt ─────────────────────────────
router.get('/prompts/v7', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'prompts', 'v7-prompt.md'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Prompt file not found for v7' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/prompts/v7-prompt.md' });
});

// ── GET /api/docs/schema/v7 — current v7 schema ──────────────────────────────
router.get('/schema/v7', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'schemas', 'v7-schema.json'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Schema file not found for v7' });
  }
  res.json({ schema: JSON.parse(fs.readFileSync(filePath, 'utf8')), path: 'docs/schemas/v7-schema.json' });
});

module.exports = router;

const express = require('express');
const { env } = require('../env');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { requireAuth, requirePlatformAdmin } = require('../middleware/requireAuth');

// Rules/prompts/schemas are internal IP — platform admins only.
router.use(requireAuth, requirePlatformAdmin);

const DOCS_DIR = env.DOCS_DIR || path.join(__dirname, '..', '..', '..', 'docs');

// ── GET /api/docs/rules — current rules.md ───────────────────────────────────
router.get('/rules', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'rules.md'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Rules file not found' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/rules.md' });
});

// ── GET /api/docs/prompts/v7 — v7 prompt ─────────────────────────────────────
router.get('/prompts/v7', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'prompts', 'v7-prompt.md'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Prompt file not found for v7' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/prompts/v7-prompt.md' });
});

// ── GET /api/docs/prompts/v9 — v9 prompt ─────────────────────────────────────
router.get('/prompts/v9', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'prompts', 'v9-prompt.md'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Prompt file not found for v9' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/prompts/v9-prompt.md' });
});

// ── GET /api/docs/schema/v7 — v7 schema ──────────────────────────────────────
router.get('/schema/v7', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'schemas', 'v7-schema.json'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Schema file not found for v7' });
  }
  res.json({ schema: JSON.parse(fs.readFileSync(filePath, 'utf8')), path: 'docs/schemas/v7-schema.json' });
});

// ── GET /api/docs/schema/v9 — v9 schema ──────────────────────────────────────
router.get('/schema/v9', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'schemas', 'v9-schema.json'); // nosemgrep
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Schema file not found for v9' });
  }
  res.json({ schema: JSON.parse(fs.readFileSync(filePath, 'utf8')), path: 'docs/schemas/v9-schema.json' });
});

module.exports = router;
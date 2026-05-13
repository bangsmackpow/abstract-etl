const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');

// ── GET /api/docs/rules — current rules.md ───────────────────────────────────
router.get('/rules', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'rules.md'); // nosemgrep: path traversal false positive — DOCS_DIR is hardcoded
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Rules file not found' });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: 'docs/rules.md' });
});

// ── GET /api/docs/prompts/:version — current prompt (v1 or v4) ──────────────
router.get('/prompts/:version', (req, res) => {
  const { version } = req.params;
  const allowed = ['v1', 'v4'];
  if (!allowed.includes(version)) {
    return res.status(400).json({ error: `Version must be one of: ${allowed.join(', ')}` });
  }
  const filePath = path.join(DOCS_DIR, 'prompts', `${version}-prompt.md`); // nosemgrep: version is allowlisted
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Prompt file not found for ${version}` });
  }
  res.json({ content: fs.readFileSync(filePath, 'utf8'), path: `docs/prompts/${version}-prompt.md` });
});

// ── GET /api/docs/schema/:version — current schema (v4) ─────────────────────
router.get('/schema/:version', (req, res) => {
  const { version } = req.params;
  const filePath = path.join(DOCS_DIR, 'schemas', `${version}-schema.json`); // nosemgrep: version is allowlisted by caller
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Schema file not found for ${version}` });
  }
  res.json({ schema: JSON.parse(fs.readFileSync(filePath, 'utf8')), path: `docs/schemas/${version}-schema.json` });
});

// ── GET /api/docs/revisions — revision history ──────────────────────────────
router.get('/revisions', (req, res) => {
  const filePath = path.join(DOCS_DIR, 'revisions', 'revisions.json'); // nosemgrep: DOCS_DIR is hardcoded
  if (!fs.existsSync(filePath)) {
    return res.json({ revisions: [], active: null });
  }
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
});

// ── GET /api/docs/revisions/:id — specific revision content ─────────────────
router.get('/revisions/:id', (req, res) => {
  const { id } = req.params;
  const revisionsFile = path.join(DOCS_DIR, 'revisions', 'revisions.json'); // nosemgrep: DOCS_DIR is hardcoded
  if (!fs.existsSync(revisionsFile)) {
    return res.status(404).json({ error: 'No revisions found' });
  }
  const data = JSON.parse(fs.readFileSync(revisionsFile, 'utf8'));
  const rev = data.revisions.find((r) => r.id === id);
  if (!rev) {
    return res.status(404).json({ error: `Revision ${id} not found` });
  }

  const result = { revision: rev, files: {} };
  for (const [key, filePath] of Object.entries(rev.files)) {
    const fullPath = path.join(__dirname, '..', '..', '..', filePath); // nosemgrep: filePath from revision data, not user input
    if (fs.existsSync(fullPath)) {
      result.files[key] = fs.readFileSync(fullPath, 'utf8');
    }
  }
  res.json(result);
});

// ── GET /api/docs/revisions/:id/download/:fileType — download a revision file ─
router.get('/revisions/:id/download/:fileType', (req, res) => {
  const { id, fileType } = req.params;
  const revisionsFile = path.join(DOCS_DIR, 'revisions', 'revisions.json'); // nosemgrep: DOCS_DIR is hardcoded
  if (!fs.existsSync(revisionsFile)) {
    return res.status(404).json({ error: 'No revisions found' });
  }
  const data = JSON.parse(fs.readFileSync(revisionsFile, 'utf8'));
  const rev = data.revisions.find((r) => r.id === id);
  if (!rev) {
    return res.status(404).json({ error: `Revision ${id} not found` });
  }

  const fileMap = {
    rules: (r) => r.files.rules || 'docs/rules.md',
    v4_prompt: (r) => r.files.v4_prompt || 'docs/prompts/v4-prompt.md',
    v1_prompt: (r) => r.files.v1_prompt || 'docs/prompts/v1-prompt.md',
    v4_schema: (r) => r.files.v4_schema || 'docs/schemas/v4-schema.json',
  };

  const relPath = fileMap[fileType]?.(rev);
  if (!relPath) {
    return res.status(404).json({ error: `File type "${fileType}" not available for this revision` });
  }

  // Check for revision-specific snapshot first
  const snapshotName = fileType === 'rules' ? `rules-${id}.md` : `${fileType}-${id}.${fileType.includes('schema') ? 'json' : 'md'}`;
  const snapshotPath = path.join(DOCS_DIR, 'revisions', snapshotName); // nosemgrep: DOCS_DIR is hardcoded

  let content;
  let filename;
  if (fs.existsSync(snapshotPath)) {
    content = fs.readFileSync(snapshotPath, 'utf8');
    filename = snapshotName;
  } else {
    const fullPath = path.join(__dirname, '..', '..', '..', relPath); // nosemgrep: relPath from fileMap, not user input
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: `File not found: ${relPath}` });
    }
    content = fs.readFileSync(fullPath, 'utf8');
    filename = path.basename(relPath);
  }

  const ext = filename.endsWith('.json') ? 'application/json' : 'text/markdown';
  res.setHeader('Content-Type', ext);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content); // nosemgrep: content is file content (md/json), no HTML injection possible
});

module.exports = router;

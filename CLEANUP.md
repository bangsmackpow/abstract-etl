# Cleanup Plan

Instructions for executing each YAGNI finding from the report. Tasks grouped by type. Do them in order within each section where noted.

---

## 1. Fix / Remove Broken V1/V2 Extraction

V1 and V2 extraction paths in `googleAiService.extractFromPDF` silently fall through to V4. The frontend still renders V1Form/V2Form and bulk import defaults to `version='v2'`.

### Option A: Remove V1/V2 entirely (recommended if unused)

```bash
# In googleAiService.js, remove the fallthrough: make v1/v2 throw an error
# In docxGenerator.js, remove generateV1Docx and generateV2Docx
# In markdownGenerator.js, remove generateV1Markdown and generateV2Markdown
# In frontend AbstractForm.jsx, remove V1Form and V2Form components
# In bulk import (extract.js line 79), change default version to 'v4'
# In docs.js, remove 'v1', 'v2' from allowed prompt/schema version lists
# In docs route, remove v1/v2 from schema allowed versions
```

### Option B: Fix V1/V2 (if still needed by clients)

Create v1-prompt.md and v2-prompt.md with correct schemas. Add V1/V2 prompt/schema loading in `googleAiService.js`. Ensure `extractFromPDF` routes to the correct prompt.

---

## 2. Consolidate Output Generators (Biggest Win)

The three generator files (PDF, DOCX, MD) each re-implement the same schema-to-output logic for every version. Roughly 5000 lines of duplication.

### Strategy: Extract a shared schema descriptor

1. Create `backend/src/services/renderHelpers.js`:

   ```
   function renderOrderInfo(fields, format) { ... }
   function renderChainOfTitle(entries, format) { ... }
   function renderMortgages(entries, format) { ... }
   // etc. for each section
   ```

   where `format` is one of `'pdf-v4'`, `'pdf-v5'`, `'pdf-v6'`, `'pdf-v7'`, `'docx'`, `'md'`.

2. Each generator imports from renderHelpers instead of duplicating.

3. V5 → V6 → V7 differences become parameter flags (e.g., `{ showCompletedDate: false, showAssessorOwner: true }`), not separate functions.

---

## 3. Dead Dependency: Remove `mammoth`

```bash
npm uninstall mammoth -w backend
```

Verify with:

```bash
rg "mammoth" backend/src
```

---

## 4. Fix Stale `knip.json` Ignores

Edit `knip.json`: remove `"sharp"`, `"pdf2pic"`, `"pocketbase"` from `ignoreDependencies`.

---

## 5. Remove `POCKETBASE_ADMIN_EMAIL` Reference

In `backend/src/routes/extract.js` line 137:

```diff
- const adminEmail = process.env.ADMIN_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
+ const adminEmail = process.env.ADMIN_EMAIL;
```

---

## 6. Strip Down Backup Service

Replace the full backup system with a simple script. Keep `manualBackup` only.

Steps:

1. Remove `restoreBackup`, `getBackupPath`, `cleanupOldBackups`, `scheduledBackup`, `startBackupScheduler`, `stopBackupScheduler`, `restartScheduler` from `backupService.js`.
2. Remove the backup interval `setInterval` from `index.js` (line 183 `startBackupScheduler()`).
3. Remove backup admin UI routes from `admin.js` (lines 119-139) and frontend `Admin.jsx` (the "Backups" tab section).
4. Remove the `backups` table from `schema.js` (unless you want to keep manual backups as a feature — if so, keep `manualBackup` and the `GET /admin/backups` list endpoint).
5. Remove backup-related settings from `SETTING_KEYS` in `admin.js`.

---

## 7. Strip Down Email Service (Optional)

If notifications aren't needed, remove:

1. `emailService.js` entirely.
2. Email sending calls in `jobs.js` (line 165-178), `extract.js` (line 138-141).
3. Email settings from admin routes and frontend.
4. `nodemailer` dependency: `npm uninstall nodemailer -w backend`.
5. `sendBackupNotification` import in `backupService.js`.
6. SMTP settings from `SETTING_KEYS` in `admin.js`.

If keeping notifications, at least replace HTML templates with plain text and remove the DB-overridable SMTP config — just use env vars.

---

## 8. Remove Revision History CMS

Remove everything in `docs.js` except the `/rules` endpoint:

```diff
# Keep only:
router.get('/rules', ...)
# Remove:
router.get('/prompts/:version', ...)
router.get('/schema/:version', ...)
router.get('/revisions', ...)
router.get('/revisions/:id', ...)
router.get('/revisions/:id/download/:fileType', ...)
```

---

## 9. Remove `aiFlagsJson`

1. In `extract.js`, remove the `flagFields` function (lines 37-56) and the `aiFlags` response key.
2. In `schema.js`, remove the `aiFlagsJson` column from the jobs table (run a migration to drop the column).
3. In the frontend `EditJob.jsx` and `AbstractForm.jsx`, remove all `aiFlags` and `onFlagChange` props.
4. Remove `aiFlagsJson` from the API responses and the `PATCH` handler.

---

## 10. Strip Debug Logging

In `googleAiService.js`, remove all emoji-prefixed `console.log` lines (lines 135-162 inside the `extractFromPDF` function).

---

## 11. Consolidate V7 DOCX Routes

The `/docx-text` and `/docx-table` routes in `generate.js` could be merged into the main `/docx` route by adding a `?format=text|table` query parameter. Or, if both are needed, keep them but remove the separate `generateV7TextDocx` call from inside `generateDocx` to avoid duplicate code paths.

---

## 12. Remove `_addTextField` Dead Code

In `pdfGenerator.js`, delete lines 100-107 (the `_addTextField` function).

---

## 13. Clean Up Error Handling

In `extract.js`, remove the outer try/catch around the single-POST route — `express-async-errors` handles it.

---

## 14. Fix Dotenv Load Order

In `index.js`, move `require('dotenv').config()` to the very top, before `require('./env')`:

```diff
+ require('dotenv').config();
  const { env } = require('./env');
- require('dotenv').config();
```

---

## 15. Remove Artifact Directories

```bash
Remove-Item -LiteralPath "backend/src/{routes,services,templates,middleware}" -Force -Recurse -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "frontend/src/{pages,components,services,hooks}" -Force -Recurse -ErrorAction SilentlyContinue
```

---

## 16. Separate Save from Download

In `EditJob.jsx`, remove `handleSave()` calls from inside download handlers. Require the user to save explicitly before downloading, or add `await`-only-if-unsaved logic.

---

## 17. Gitignore `.eslintcache`

```diff
# .gitignore
+ .eslintcache
```

Then remove the committed file:

```bash
git rm --cached .eslintcache
```

---

## 18. Trim Husky Hooks

Remove unused hooks from `.husky/_/`. Keep only `pre-commit`, `commit-msg`, and `h` (the helper). Remove `applypatch-msg`, `post-applypatch`, `post-checkout`, `post-commit`, `post-merge`, `post-rewrite`, `pre-applypatch`, `pre-auto-gc`, `pre-merge-commit`, `pre-push`, `pre-rebase`, `prepare-commit-msg`.

---

## Priority Order

| Priority | Task | Effort | Risk |
|----------|------|--------|------|
| 1 | Fix V1/V2 (remove or fix) | Low | Medium (if clients use it) |
| 2 | Remove `mammoth` + stale knip ignores | Trivial | None |
| 3 | Fix dotenv load order | Trivial | None |
| 4 | Remove `POCKETBASE_ADMIN_EMAIL` | Trivial | None |
| 5 | Remove artifact directories | Trivial | None |
| 6 | Gitignore `.eslintcache` | Trivial | None |
| 7 | Remove debug logging | Trivial | None |
| 8 | Remove `_addTextField` dead code | Trivial | None |
| 9 | Remove `aiFlagsJson` | Medium | Low |
| 10 | Remove revision CMS | Medium | Low |
| 11 | Strip down email service | Medium | Low |
| 12 | Consolidate V7 DOCX routes | Low | Low |
| 13 | Separate save from download | Low | Low |
| 14 | Clean up error handling | Low | Low |
| 15 | Trim Husky hooks | Low | Low |
| 16 | Strip down backup service | Medium | Low |
| 17 | **Consolidate generators** | **High** | **Medium** |

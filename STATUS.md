# Project Status

## Current State
- **Architecture**: Monorepo with industrial-grade foundations (ESLint, Prettier, Husky).
- **AI Engine**: **Gemini 2.5 Flash (Native)**. Finalized after resolving environment and API key issues.
- **V2 Workflow**: Fully implemented and production-ready. Includes v2 schema extraction, 12-section PDF/DOCX/MD report generation, and complete UI rendering.
- **Accuracy**: High-quality extraction restored with the stable `gemini-2.5-flash` model.
- **Reliability**: All known API connection, build, and UI rendering issues have been resolved.
- **Admin**: Full deletion capabilities and Zod-validated environment startup.

## Recent Milestones
- [x] **Phase 1 Foundations**: Strict TypeScript and linting safety gates live.
- [x] **Phase 2 Completion & Bug Fixes**: V2 system is now feature-complete and stable.
- [x] **V2 Implementation Complete**:
  - [x] All UI rendering issues ("white screen") resolved.
  - [x] All PDF download and backend generation routes are complete.
  - [x] PDF reports are now multi-page with all 12 sections (Property, Vesting, Chain of Title, Mortgages, Associated Documents, Judgments/Liens, Miscellaneous Documents, Tax Status, Examiner Instructions, Legal Description, Names Searched, Additional Info).
  - [x] V2 DOCX and V2 Markdown generators include all 12 sections matching the PDF output.
  - [x] All form components (`V1Form`, `V2Form`) are fully implemented.
  - [x] DOCX and Markdown generators support both v1 and v2 schemas with automatic routing.
- [x] **templateVersion Bug Fixed**: POST /api/jobs no longer hardcodes `templateVersion: 'v1'`. Frontend's version selection is now respected, fixing the root cause of v2 reports showing blank fields.
- [x] **JSON Parsing Hardened**: Replaced simple `JSON.parse` with brace-depth tracking and fallback parsing to handle AI edge cases (extra text after JSON, trailing commas, code fences).
- [x] **PDF Blank Page Elimination**: Switched to `bufferPages: true` with deferred footer rendering via `bufferedPageRange()`. Eliminated phantom blank pages on even-numbered pages caused by `text()` at absolute Y positions interfering with manual page management.
- [x] **Hazelwood Logo**: Added `HazelwoodLogoFinal.png` to PDF report header (100px wide, small file footprint).
- [x] **V2 Markdown Export**: Restored Markdown (.md) download button for V2 jobs in the UI alongside PDF export. Fixed address field mapping for V2 schema.
- [x] **V2 Schema Expanded**: Added `associated_documents`, `judgments_liens`, `misc_documents`, `names_searched`, and `additional_information` to the V2 AI extraction prompt so the AI populates all report sections.
- [x] **API Stability Resolved**: Corrected environment, API key, and dependency issues to establish a stable connection to the Google AI service.
- [x] **Customer Rules**: Priority-based File Number extraction and mandatory sequence enforced.
- [x] **Foreclosure Logic**: Trustee's Deed grouping and starred reference item formatting.
- [x] **Names Searched Refinement**: Detailed inclusion/exclusion rules and borrower-first sorting.
- [x] **Professional Style Rules**: Implemented semantic spouse separators (&), life estate syntax, and automated township city-inference.
- [x] **Smart Chain Filtering**: Numbered chain for Insales; Outsales/Encumbrances in Additional Info.
- [x] **Feature: Alternatives**: AI-powered value alternatives are live in the UI.
- [x] **Admin: Deletion**: Admin deletion capabilities are functional.

## Active Blockers / Issues
- **Cleanup Needed**: Legacy dependencies like `sharp`, `pdf2pic`, and `pocketbase` still exist in `package.json` but are no longer used by the native AI pipeline.

## Roadmap
- [ ] **Cleanup Run**: Execute `npx knip` recommendations to prune the codebase.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

## Recent Milestones (May 2026)
- [x] **PDF Blank Page Fixed (Final)**: Footer Y-position now clamped above bottom margin, preventing PDFKit from auto-creating trailing blank pages. Pure linear rendering retained.
- [x] **PDF Logo Fixed**: Corrected logo path resolution (`../../../docs/logo/` instead of `../../docs/logo/`) so `HazelwoodLogoFinal.png` actually renders in PDF reports.
- [x] **Bulk Import Feature**: `POST /api/extract/bulk` accepts up to 50 PDFs, processes each through Gemini AI, saves as draft jobs, and emails a summary to the user. Frontend bulk upload page at `/jobs/bulk` with multi-file selection and result breakdown.
- [x] **Database Backup System**: `backupService.js` handles manual + scheduled SQLite backups. Auto-cleanup by retention policy. Email notification on failure. Configured via Admin UI. Manual backups support notes/comments. All backups (manual + auto) listed in history with download + restore buttons.
- [x] **Backup Restore**: `POST /api/admin/backups/:id/restore` uses better-sqlite3 built-in backup API for live restore without server restart. Safety pre-restore snapshot automatically created. Admin UI restore button with confirmation dialog.
- [x] **Backup Download**: `GET /api/admin/backups/:id/download` streams the backup file. Download button per row in admin UI.
- [x] **Admin Settings UI**: New Backups and Settings tabs in admin panel. SMTP config (host, port, user, pass, from) stored in `settings` table, overrides env vars at runtime. Backup schedule (interval, retention, enabled/disabled) configurable without restart.
- [x] **Email Broadcast Extended**: `emailService.js` now supports `sendBulkImportNotification()` and `sendBackupNotification()` in addition to existing `sendCompletionEmail()`.

## V4 Hazelwood Milestones (May 2026)
- [x] **V4 Schema & Prompt**: Created `V4_SCHEMA` and `SYSTEM_PROMPT_V4` in `googleAiService.js` with 12-section Hazelwood run sheet format, ALL CAPS output, and standardized deed types.
- [x] **V4 Extraction Validated**: Tested against 9 sample PDFs — 8/9 PASS (89%), 1/9 PARTIAL (missing order number for Eastman Credit Union, expected behavior).
- [x] **V4 Order Number Fallback Rule**: Added fallback for Eastman Credit Union and Clear Choice Abstracting — uses "COMPANY NAME - PROPERTY ADDRESS" when no order number is present.
- [x] **V4 PDF Generator**: Multi-page PDF with Times-Roman font, Hazelwood branding, section page breaks, all fields fully editable.
- [x] **V4 DOCX Generator**: Word document output matching PDF layout with all 12 sections.
- [x] **V4 Markdown Generator**: Plain text output with all 12 sections.
- [x] **V4 Frontend Form**: `V4Form` component with all 12 sections, array support for chain of title (grantors/grantees), tax installments, associated documents, judgments/liens, misc documents, and names searched.
- [x] **V4 UI Toggles**: New Job, Edit Job, and Bulk Import pages all support v4 template version selection.
- [x] **V4 Documentation**: `docs/rules.md` created as single source of truth for all extraction rules, output sections, template versions, and documentation update policy.

## V6 Enhanced Milestones (July 2026)
- [x] **V6 Schema**: Created `docs/schemas/v6-schema.json` extending V5 with new fields: `assessor_owner`, `assessor_description`, `acreage`, `loan_number`, `min`, `status` (mortgages), `interest`, `costs`, `attorneys_fees` (liens), `area_or_width`, `notes` (misc), and `document_accounting[]`.
- [x] **V6 Prompt**: Created `docs/prompts/v6-prompt.md` incorporating all 17 sections from customer rules (v6_rules.md), including complete document review, PDF document accounting, wills/probate/heirs handling, and recorded references.
- [x] **V6 AI Service**: Added V6 schema/prompt loading and version routing in `googleAiService.js`.
- [x] **V6 PDF Generator**: Extended `v5PdfGenerator.js` with `generateV6Report()` rendering all new fields and document accounting.
- [x] **V6 DOCX Generator**: Added `generateV6Docx()` in `docxGenerator.js` with V6 table layouts.
- [x] **V6 Markdown Generator**: Added `generateV6Markdown()` in `markdownGenerator.js` with V6 formatting.
- [x] **V6 Route**: Added V6 branch in `generate.js` PDF route.
- [x] **V6 Frontend Form**: Created `V6Form` component with `V6MortgageEntry`, `V6JudgmentEntry`, `V6MiscDocEntry`, and `V6DocAccountingEntry` sub-components.
- [x] **V6 UI Toggles**: Added "V6 (Enhanced)" button to NewJob version selector, V6 status badge styling in Dashboard.
- [x] **V6 Documentation**: Updated `docs/rules.md` with V6 extraction rules and output sections. Updated `AGENTS.md` with V6 template version.

## V7 Enhanced Report Milestones (July 2026)
- [x] **V7 Schema**: Created `docs/schemas/v7-schema.json` with separate TAX INFORMATION section, supporting_documents sub-array in chain entries, dual-type misc_documents (estate and document subtypes), combined client_order field, and document_accounting in additional_information.
- [x] **V7 Prompt**: Created `docs/prompts/v7-prompt.md` with 9-section report order, supporting document rules, separate tax section rules, and order/verification notes.
- [x] **V7 AI Service**: Added V7 schema/prompt loading and version routing in `googleAiService.js`.
- [x] **V7 Text DOCX Generator**: Added `generateV7TextDocx()` in `docxGenerator.js` — text-based layout matching blank.docx (paragraphs, no table borders).
- [x] **V7 Table DOCX Generator**: Added `generateV7TableDocx()` in `docxGenerator.js` — table-based layout like v5/v6 style with v7 fields.
- [x] **V7 Markdown Generator**: Added `generateV7Markdown()` in `markdownGenerator.js` with 9-section v7 format.
- [x] **V7 PDF Generator**: Added `generateV7Report()` in `v5PdfGenerator.js` — text-based clean PDF with v7 fields.
- [x] **V7 Routes**: Added `/generate/:jobId/docx-text`, `/generate/:jobId/docx-table`, and v7 PDF routing in `generate.js`.
- [x] **V7 Frontend Form**: Created `V7Form` component with all v7 sub-components (V7ChainEntry, V7ChainSupportingDoc, V7MortgageEntry, V7MortgageAssocDoc, V7JudgmentEntry, V7MiscDocEntry, V7DocAccountingEntry) matching blank.docx labeled layout.
- [x] **V7 UI Toggles**: Added "V7 (Enhanced Report)" button to NewJob version selector. Two DOCX download buttons (Text / Table) on EditJob for v7 jobs.
- [x] **V7 API Methods**: Added `downloadDocxText()` and `downloadDocxTable()` in `api.js` frontend service.
- [x] **V7 Documentation**: Updated `docs/rules.md` with V7 extraction rules and output formats. Updated `AGENTS.md` with V7 template version. Updated all project markdown files for V7 handoff.

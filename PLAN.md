# Development Plan

## Phase 1: Code Hygiene & Foundations (FINISHED ✅)
- [x] **Monorepo Setup**: Root-level orchestration with npm workspaces.
- [x] **Strict TypeScript**: Global `tsconfig.json` foundations.
- [x] **Deterministic Linting**: Centralized ESLint 8 + Prettier rules.
- [x] **Safety Gates**: Husky + lint-staged pre-commit checks.
- [x] **Runtime Validation**: Zod-powered environment validation for backend and frontend.

## Phase 2: User Experience & Accuracy (FINISHED ✅)
- [x] **Native PDF Pass-Through**: Switch to direct Google SDK to eliminate image conversion bottlenecks.
- [x] **Gemini 2.5 Upgrade**: Standardized on the stable `gemini-2.5-flash` model after resolving API/environment issues.
- [x] **V2 Job System**: Implemented a parallel workflow for the ProTitleUSA schema.
- [x] **V2 PDF Generation**: Added a high-fidelity multi-page PDF generator with all sections (property info, vesting, chain of title, mortgages, tax status, examiner instructions, legal description, names searched).
- [x] **V2 UI Rendering**: Fully implemented the v2 form and fixed all rendering issues.
- [x] **AI Alternatives & Smart Suggestions**: Implement dropdowns for ambiguous data points and fuzzy matching against master lists.
- [x] **Markdown Export**: Add high-fidelity .md generation supporting both v1 and v2 schemas with template-based routing.
- [x] **Word Export**: Add .docx generation supporting both v1 and v2 schemas with template-based routing.
- [x] **Customer Priority Rules**: Implement File Number logic and extraction sequencing.
- [x] **Admin Deletion**: Add job deletion capabilities for system administrators.
- [x] **templateVersion Routing Fix**: Fixed bug where all jobs were hardcoded as v1 regardless of extraction standard selected.

## Phase 3: Cleanup & Refinement (COMPLETE ✅)
- [x] **Mobile Admin**: Adjusted CSS for the metrics table to be readable on smaller screens.
- [x] **JSON Robustness**: Added brace-depth tracking and fallback parsing to handle AI response edge cases.
- [x] **PDF Blank Page Elimination**: Switched to `bufferPages: true` with deferred footer rendering to eliminate phantom blank pages. Added Hazelwood logo to report header.
- [x] **V2 Generator Completion**: Updated V2 DOCX and Markdown generators to include all 12 sections matching the PDF output (associated documents, judgments/liens, misc documents, examiner instructions, names searched, additional information).
- [x] **V2 Schema Expansion**: Added `associated_documents`, `judgments_liens`, `misc_documents`, `names_searched`, and `additional_information` to the V2 AI extraction prompt so all report sections are populated.
- [x] **V2 Markdown Export**: Restored Markdown download button for V2 jobs in the frontend alongside PDF export.
- [ ] **Cleanup**: Use `knip` to remove dead legacy code and dependencies (PocketBase, sharp, pdf2pic, etc.).

## Phase 5: V4 Hazelwood (COMPLETE ✅)
- [x] **V4 Schema & Prompt**: Created `V4_SCHEMA` and `SYSTEM_PROMPT_V4` with 12-section Hazelwood run sheet format, ALL CAPS output, standardized deed types, and extraction rules.
- [x] **V4 Extraction Validation**: Tested against 9 sample PDFs — 8/9 PASS (89%), 1/9 PARTIAL (expected missing order number for Eastman Credit Union).
- [x] **V4 Order Number Fallback Rule**: Added fallback for Eastman Credit Union and Clear Choice Abstracting — uses "COMPANY NAME - PROPERTY ADDRESS" when no order number is present.
- [x] **V4 PDF Generator**: Multi-page PDF with Times-Roman font, Hazelwood branding, section page breaks, all fields fully editable.
- [x] **V4 DOCX Generator**: Word document output matching PDF layout with all 12 sections.
- [x] **V4 Markdown Generator**: Plain text output with all 12 sections.
- [x] **V4 Frontend Form**: `V4Form` component with all 12 sections, array support for chain of title (grantors/grantees), tax installments, associated documents, judgments/liens, misc documents, and names searched.
- [x] **V4 UI Toggles**: New Job, Edit Job, and Bulk Import pages all support v4 template version selection.
- [x] **V4 Documentation**: `docs/rules.md` created as single source of truth. Documentation update policy established in AGENTS.md and rules.md.

## Phase 6: V6 Enhanced (COMPLETE ✅)
- [x] **V6 Schema**: Created `docs/schemas/v6-schema.json` extending V5 with new fields (assessor_owner, assessor_description, acreage, loan_number, min, status, interest, costs, attorneys_fees, area_or_width, document_accounting[]).
- [x] **V6 Prompt**: Created `docs/prompts/v6-prompt.md` incorporating complete document review rules, PDF document accounting, wills/probate/heirs handling, recorded references, and quality control checklist.
- [x] **V6 AI Service**: Added V6 schema/prompt loading and version routing in `googleAiService.js`.
- [x] **V6 PDF Generator**: Extended `v5PdfGenerator.js` with `generateV6Report()` rendering all new fields and document accounting.
- [x] **V6 DOCX Generator**: Added `generateV6Docx()` with V6 table layouts for all new fields.
- [x] **V6 Markdown Generator**: Added `generateV6Markdown()` with V6 formatting.
- [x] **V6 Route**: Added V6 branch in `generate.js` PDF route.
- [x] **V6 Frontend Form**: Created `V6Form` component with V6-specific sub-components (V6MortgageEntry, V6JudgmentEntry, V6MiscDocEntry, V6DocAccountingEntry).
- [x] **V6 UI Toggles**: Added "V6 (Enhanced)" button to NewJob version selector, V6 status badge styling in Dashboard.
- [x] **V6 Documentation**: Updated `docs/rules.md` with V6 extraction rules and output sections. Updated `AGENTS.md` with V6 template version.

## Phase 7: V7 Enhanced Report (COMPLETE ✅)
- [x] **V7 Schema**: Created `docs/schemas/v7-schema.json` with separate TAX INFORMATION, supporting_documents sub-array, dual-type misc_documents, combined client_order field.
- [x] **V7 Prompt**: Created `docs/prompts/v7-prompt.md` with 9-section report order and v7-specific extraction rules.
- [x] **V7 AI Service**: Added V7 schema/prompt loading and version routing in `googleAiService.js`.
- [x] **V7 Text DOCX Generator**: Created `generateV7TextDocx()` matching blank.docx (paragraph-based, no table borders).
- [x] **V7 Table DOCX Generator**: Created `generateV7TableDocx()` with v5/v6-style table format.
- [x] **V7 Markdown Generator**: Created `generateV7Markdown()` with 9-section v7 format.
- [x] **V7 PDF Generator**: Created `generateV7Report()` with text-based clean format.
- [x] **V7 Routes**: Added `/docx-text` and `/docx-table` endpoints, v7 PDF routing.
- [x] **V7 Frontend Form**: Created `V7Form` with all sub-components matching blank.docx layout.
- [x] **V7 UI Toggles**: Added V7 button in NewJob, dual DOCX download buttons in EditJob.
- [x] **V7 API Methods**: Added `downloadDocxText()` and `downloadDocxTable()`.
- [x] **V7 Documentation**: Updated all project markdown files, AGENTS.md, and docs/rules.md.

## Phase 8: Cloudflare Edge Migration
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Database**: Switch `better-sqlite3` to `drizzle-orm/d1`.
- [ ] **R2 Storage**: Move temporary file storage from local disk to Cloudflare R2.
- [ ] **Auth Edge**: Refactor JWT logic to use Web Crypto API (Node-independent).

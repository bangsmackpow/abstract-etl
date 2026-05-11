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

## Phase 6: Cloudflare Edge Migration
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Database**: Switch `better-sqlite3` to `drizzle-orm/d1`.
- [ ] **R2 Storage**: Move temporary file storage from local disk to Cloudflare R2.
- [ ] **Auth Edge**: Refactor JWT logic to use Web Crypto API (Node-independent).

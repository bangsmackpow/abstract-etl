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

## Phase 4: Cloudflare Edge Migration
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Database**: Switch `better-sqlite3` to `drizzle-orm/d1`.
- [ ] **R2 Storage**: Move temporary file storage from local disk to Cloudflare R2.
- [ ] **Auth Edge**: Refactor JWT logic to use Web Crypto API (Node-independent).

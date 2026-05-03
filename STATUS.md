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
- [ ] **Email Integration**: Finalize SMTP triggers for job completion notifications.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

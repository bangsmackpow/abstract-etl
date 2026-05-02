# Project Status

## Current State
- **Architecture**: Monorepo with industrial-grade foundations (ESLint, Prettier, Husky).
- **AI Engine**: **Gemini 2.5 Flash (Native)**. Finalized after resolving environment and API key issues.
- **V2 Workflow**: Fully implemented. Includes v2 schema, PDF generation, and a complete UI rendering form.
- **Accuracy**: High-quality extraction restored with the stable `gemini-2.5-flash` model.
- **Reliability**: All known API connection, build, and UI rendering issues have been resolved.
- **Admin**: Full deletion capabilities and Zod-validated environment startup.

## Recent Milestones
- [x] **Phase 1 Foundations**: Strict TypeScript and linting safety gates live.
- [x] **Phase 2 Completion & Bug Fixes**: V2 system is now feature-complete and stable.
- [x] **V2 Implementation Complete**:
  - [x] All UI rendering issues ("white screen") resolved.
  - [x] All PDF download and backend generation routes are complete.
  - [x] PDF reports are now multi-page with all 9 sections (Property, Vesting, Chain of Title, Mortgages, Tax Status, Examiner Instructions, Legal Description, Names Searched, Additional Info).
  - [x] All form components (`V1Form`, `V2Form`) are fully implemented.
  - [x] DOCX and Markdown generators support both v1 and v2 schemas with automatic routing.
- [x] **templateVersion Bug Fixed**: POST /api/jobs no longer hardcodes `templateVersion: 'v1'`. Frontend's version selection is now respected, fixing the root cause of v2 reports showing blank fields.
- [x] **JSON Parsing Hardened**: Replaced simple `JSON.parse` with brace-depth tracking and fallback parsing to handle AI edge cases (extra text after JSON, trailing commas, code fences).
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
- **JSON Parsing**: AI occasionally returns malformed JSON with extra content. Brace-depth tracking and fallback parsing added to mitigate.

## Roadmap
- [ ] **Cleanup Run**: Execute `npx knip` recommendations to prune the codebase.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

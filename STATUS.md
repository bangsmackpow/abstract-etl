# Project Status

## Current State
- **Architecture**: Monorepo with industrial-grade foundations (ESLint, Prettier, Husky).
- **AI Engine**: **Gemini 1.5 Flash (Native)**. Direct Google SDK integration for true PDF pass-through.
- **V2 Workflow**: Added a parallel "v2" job system for the ProTitleUSA schema, including a new PDF generator and "Smart Suggestions" UI.
- **Accuracy**: Implemented customer-specific **File Number Priority Rules** and enforced the **Hazelwood Extraction Sequence**.
- **Schema**: Unified nested `order_info` structure. Supports split tax installments (1st/2nd) and automatic ALL CAPS formatting.
- **Reliability**: Timeouts increased to 10 minutes; manual image batching removed in favor of single-shot native processing.
- **Admin**: Full deletion capabilities and Zod-validated environment startup.

## Recent Milestones
- [x] **Phase 1 Foundations**: Strict TypeScript and linting safety gates live.
- [x] **Phase 2 Completion**: Native PDF Upgrade (Gemini 1.5), v2 Job System, and feature set finalized.
- [x] **V2 Implementation**:
  - [x] Added `v2` (ProTitleUSA) schema and extraction logic.
  - [x] Created `pdfGenerator.js` for high-fidelity v2 reports.
  - [x] Implemented "Smart Suggestions" UI with fuzzy matching.
  - [x] Added version toggle to New Job page and "Standard" column to dashboard.
- [x] **Customer Rules**: Priority-based File Number extraction and mandatory sequence enforced.
- [x] **Foreclosure Logic**: Trustee's Deed grouping and starred reference item formatting.
- [x] **Names Searched Refinement**: Detailed inclusion/exclusion rules (Heirs, Owners, etc.) and borrower-first sorting.
- [x] **Professional Style Rules**: Implemented semantic spouse separators (&), life estate syntax, and automated township city-inference.
- [x] **Smart Chain Filtering**: Numbered chain strictly for Insales; Outsales/Encumbrances move to Additional Information.
- [x] **Feature: Alternatives**: Added AI-powered value alternatives in the UI.
- [x] **Admin: Deletion**: Added trash-icon actions across all job tables.

## Active Blockers / Issues
- **Cleanup Needed**: Legacy dependencies like `sharp`, `pdf2pic`, and `pocketbase` still exist in `package.json` but are no longer used by the native AI pipeline.

## Roadmap
- [ ] **Cleanup Run**: Execute `npx knip` recommendations to prune the codebase.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

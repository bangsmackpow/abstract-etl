# Project Status

## Current State
- **Architecture**: Monorepo with industrial-grade foundations (ESLint, Prettier, Husky).
- **AI Engine**: **Gemini 2.0 Flash (Native)**. Bypasses OpenRouter for true PDF pass-through.
- **Accuracy**: Implemented customer-specific **File Number Priority Rules** and enforced the **Hazelwood Extraction Sequence**.
- **Schema**: Unified nested `order_info` structure. Supports split tax installments (1st/2nd) and automatic ALL CAPS formatting.
- **Reliability**: Timeouts increased to 10 minutes; manual image batching removed in favor of single-shot native processing.
- **Admin**: Full deletion capabilities and Zod-validated environment startup.

## Recent Milestones
- [x] **Phase 1 Foundations**: Strict TypeScript and linting safety gates live.
- [x] **Native PDF Upgrade**: Moved to direct `@google/generative-ai` integration.
- [x] **Feature: Alternatives**: Added AI-powered value alternatives in the UI.
- [x] **Feature: Markdown**: Dual-format reporting (.docx and .md) completed.
- [x] **Admin: Deletion**: Added trash-icon actions across all job tables.

## Active Blockers / Issues
- **Cleanup Needed**: Legacy dependencies like `sharp`, `pdf2pic`, and `pocketbase` still exist in `package.json` but are no longer used by the native AI pipeline.

## Roadmap
- [ ] **Cleanup Run**: Execute `npx knip` recommendations to prune the codebase.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

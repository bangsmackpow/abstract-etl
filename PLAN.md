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
- [x] **V2 PDF Generation**: Added a high-fidelity PDF generator and download endpoint.
- [x] **V2 UI Rendering**: Fully implemented the v2 form and fixed all rendering issues.
- [x] **AI Alternatives & Smart Suggestions**: Implement dropdowns for ambiguous data points and fuzzy matching against master lists.
- [x] **Markdown Export**: Add high-fidelity .md generation.
- [x] **Customer Priority Rules**: Implement File Number logic and extraction sequencing.
- [x] **Admin Deletion**: Add job deletion capabilities for system administrators.

## Phase 3: Cleanup & Refinement (CURRENT 🔄)
- [ ] **Mobile Admin**: Adjust CSS for the metrics table to be readable on smaller screens.
- [ ] **Cleanup**: Use `knip` to remove dead legacy code and dependencies (PocketBase, sharp, pdf2pic, etc.).
- [ ] **Email Integration**: Finalize SMTP triggers for job completion notifications.

## Phase 4: Cloudflare Edge Migration
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Database**: Switch `better-sqlite3` to `drizzle-orm/d1`.
- [ ] **R2 Storage**: Move temporary file storage from local disk to Cloudflare R2.
- [ ] **Auth Edge**: Refactor JWT logic to use Web Crypto API (Node-independent).

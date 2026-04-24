# Development Plan

## Phase 1: Code Hygiene & Foundations (FINISHED ✅)
- [x] **Monorepo Setup**: Root-level orchestration with npm workspaces.
- [x] **Strict TypeScript**: Global `tsconfig.json` foundations.
- [x] **Deterministic Linting**: Centralized ESLint 8 + Prettier rules.
- [x] **Safety Gates**: Husky + lint-staged pre-commit checks.
- [x] **Runtime Validation**: Zod-powered environment validation for backend and frontend.

## Phase 2: User Experience & Accuracy (CURRENT 🔄)
- [x] **Native PDF Pass-Through**: Switch to direct Google SDK to eliminate image conversion bottlenecks.
- [x] **AI Alternatives**: Implement dropdowns for ambiguous data points.
- [x] **Markdown Export**: Add high-fidelity .md generation.
- [x] **Customer Priority Rules**: Implement File Number logic and extraction sequencing.
- [ ] **Mobile Admin**: Adjust CSS for the metrics table to be readable on smaller screens.
- [ ] **Cleanup**: Use `knip` to remove dead legacy code and dependencies (PocketBase, sharp, etc.).

## Phase 3: Cloudflare Edge Migration
- [ ] **Hono Refactor**: Rewrite Express routes to Hono for edge compatibility.
- [ ] **D1 Database**: Switch `better-sqlite3` to `drizzle-orm/d1`.
- [ ] **R2 Storage**: Move temporary file storage from local disk to Cloudflare R2.
- [ ] **Auth Edge**: Refactor JWT logic to use Web Crypto API (Node-independent).

# AGENTS.md — Abstract ETL v3

AI-powered ETL system for property abstracts. **V9 rules** (REVISION 9 of the Enhanced Report) — active extraction/formatting contract. Read `docs/rules.md` before touching extraction or output formatting.

## Quick commands (run from repo root unless noted)

- Install: `npm install --legacy-peer-deps` (required — peer-dep conflicts).
- Validate before commit: `npm run validate` = `npm run typecheck` → `npm run lint` → `knip` (knip is informational; failures are tolerated). Must pass.
- Lint: `npm run lint` (ESLint 8, legacy `.eslintrc.cjs`, not flat). Format: `npm run format` (Prettier).
- Tests: **none exist** — no `npm test` script; `backend/src/test/` is empty. Do not assume a test framework or add test-gated CI steps.
- DB codegen (run inside `backend/`): `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` (drizzle-kit). Targets `DB_PATH` or `./data/sqlite.db`.
- Dev: `npm run dev` in `backend/` (nodemon, port 3001) and `frontend/` (Vite, port 5173). Both need the required env vars below or the backend exits at startup.

## Workspace layout (npm workspaces)

- Root `package.json` owns `typecheck`/`lint`/`validate` across workspaces `backend` + `frontend`; package scripts run in their own dirs.
- Backend: `backend/src/index.js` (Express, **CommonJS** — no `"type":"module"`). Frontend: `frontend/src/main.jsx` (Vite/React, ESM).
- Backend is plain JS type-checked loosely by tsc (`allowJs`, `checkJs: false`). "Industrial-grade TS" = strict compiler flags over JS, not TS source.
- Real backend dirs: `routes/`, `services/`, `db/`, `middleware/`. Ignore the empty stray dir `backend/src/{routes,services,templates,middleware}` (a botched shell brace-expansion).

## Core services (`backend/src/services/`)

- `googleAiService.js` — primary AI engine. Native PDF pass-through to Gemini 2.5 Flash, structured JSON (`responseMimeType: "application/json"`), brace-depth JSON sanitization + fallback parse. Loads BOTH `v7-prompt.md`/`v7-schema.json` and `v9-prompt.md`/`v9-schema.json` at startup (`DOCS_DIR`, default repo `docs/`) — server throws if any is missing. `extractFromPDF(path, filename, templateVersion)` selects the contract: `v7` → V7 rules, else V9 (default).
- `v7DocxGenerator.js`, `v7PdfGenerator.js`, `v7MarkdownGenerator.js` — **legacy V7** generators (restored originals: newest-to-oldest chain, legacy fields). `v9DocxGenerator.js`, `v9PdfGenerator.js`, `v9MarkdownGenerator.js` — **current V9-rule** generators (ALL CAPS, packet-order chain with starred supporting entries, warning-red `C00000`, MIN/MATURITY NOT SHOWN, Segoe Script signature, 30/70 label split, 7-pt spacers). `routes/generate.js` dispatches on `job.templateVersion` (`v7` → v7 generators, else v9). All DOCX/PDF generators accept an optional `opts.logo` (`{data: Buffer, mime}`) passed from the job's tenant; no logo = no logo rendered (per-tenant branding, no Hazelwood fallback).
- `tenantRepo.js` — **THE only** data-access layer for `jobs`/`users` (multi-tenant-plan.md §5.1). Every call takes `tenantId` and injects `eq(table.tenantId, tenantId)`. `tenantId` is derived ONLY from the JWT (`req.tenantId`) — never from request bodies or URL params. Also owns platform-level tenant CRUD (`listTenants`, `createTenant`, `setTenantStatus`), per-tenant logo (`setTenantLogo`/`clearTenantLogo`/`getTenantLogo`), and platform-only ops (`listJobsForTenant`, `moveJobToTenant`, `createAuditLog`, `listAuditLog`).
- `db/tenantInit.js` — startup mirror of the `tenants` table + `tenant_id` columns + one-time backfill of existing users/jobs into the `default` tenant (idempotent, runs every boot).
- `emailService.js` / `backupService.js` — SMTP + SQLite backups; DB `settings` table overrides env at runtime (`smtp_host`, `backup_enabled`, `backup_interval_minutes`, `backup_retention_days`).
- `logger.js` — pino, one JSON object per line with `requestId` for Loki/Grafana. Health checks and non-API 404 scanner noise are suppressed at the source. See `docs/monitoring/README.md`.

## Env (`backend/src/env.js`, Zod-validated — exits on invalid)

Required at startup: `JWT_SECRET` (min 10 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (min 8), `GOOGLE_AI_API_KEY`. Optional: `PORT` (3001), `APP_URL`, `SMTP_*`, `DOCS_DIR`, `DB_PATH`. See `.env.example`.

⚠️ `docker-compose.yml` still wires `GEMINI_API_KEY` / `OPENROUTER_API_KEY` / `AI_PROVIDER` / `AI_MODEL`, but no backend code reads them — only `GOOGLE_AI_API_KEY` is used. Do not add them to `env.js` to "fix" compose.

## Key rules

1. **Hygiene**: never commit code that fails `npm run validate`.
2. **Schema integrity**: change `backend/src/db/schema.js` → `npm run db:generate` (in `backend/`). `settings`/`backups` are also auto-created + drift-repaired via raw SQL in `index.js` startup.
3. **Native PDF only**: do NOT use `pdf2pic` or `sharp` for extraction.
4. **Native APIs**: prefer Web APIs (fetch, crypto) over Node-specific ones (Cloudflare migration).
5. **JSON mode**: AI must return structured JSON with `responseMimeType: "application/json"`.
6. **templateVersion**: persisted on each job (`v7` or `v9`). Extraction (`extractFromPDF`), generation (`routes/generate.js`), and the review form all honor the job's stored version. V9 (REVISION 9 rules) is the default/current contract; V7 remains available for side-by-side testing. Review form is `frontend/src/components/V7Form.jsx`.
7. **Settings table** (key-value) overrides env at runtime. Update via `PATCH /api/admin/settings`.
8. **Backups**: snapshots in `backend/backups/` (volume `/app/backups`). Manual via admin UI or `POST /api/admin/backup`; restore via `POST /api/admin/backups/:id/restore`.
9. **Dead code**: all v1–v6 code is removed. Do not reintroduce legacy version dispatch, forms, or generators.
10. **Real data security**: never commit real abstracts, owner names, addresses, or confidential documents. Fictional samples go in `docs/sample_output/`; real-data dirs are gitignored (see `.gitignore`). `stack.env` is **tracked in git** — keep placeholders only, never real secrets (CI's `env-audit` warns on this).
11. **Docs policy**: extraction-rule, format, or major-architecture changes MUST update `docs/rules.md` (and this file when agent workflows change). Commit: `docs: update rules for [change description]`.
12. **Tenant scoping (multi-tenant)**: `jobs`/`users` are queried ONLY through `tenantRepo.js` with `tenantId` from the JWT (`req.tenantId`). Never accept `tenant_id` from request bodies/params. Every `GET/PATCH/DELETE /jobs/:id` and `GET /generate/:jobId/*` must return **404** (not 403) for a foreign tenant's ID.
13. **Authz split**: `role === 'admin'` = tenant admin (own tenant only). `is_platform_admin` = platform super-admin (global settings, backups, `/api/platform/tenants`). A tenant admin must NEVER reach global settings/backups/platform routes. Suspended tenants are rejected at `requireAuth` and at login.
14. **Schema changes**: adding a tenant-scoped column/table → edit `backend/src/db/schema.js` → `npm run db:generate` (in `backend/`) AND mirror the same in `backend/src/db/tenantInit.js` raw SQL (idempotent, fresh-install path).
15. **Tenant branding (per-tenant logo)**: stored as `logo_blob` (base64) + `logo_mime` on `tenants`. Tenant admin uploads/clears their own tenant's logo via `PUT/DELETE /api/admin/logo` (PNG/JPG ≤2MB). `routes/generate.js` loads the tenant's logo and passes `opts.logo` into the DOCX/PDF generators. No logo = no logo rendered (no Hazelwood fallback).
16. **Reporting**: `GET /api/admin/metrics` (tenant admin) returns status breakdown, per-user counts/time, volume-over-time, processing-time stats (avg/max/p50/p95), and slow-job list, with optional `from`/`to` date filters. `GET /api/admin/metrics/export` returns the tenant's jobs as CSV.
17. **Move job across tenants (platform)**: `POST /api/platform/jobs/:id/move {toTenantId}` (platform admin only) moves a job, reassigns `createdBy` to the destination tenant's first admin, and writes an `audit_log` entry (`job.move`). `GET /api/platform/tenants/:id/jobs` lists a tenant's jobs; `GET /api/platform/audit` lists recent privileged actions.

## Gotchas

- **Docs conflict**: `CUSTOMER_RULES_SIGNOFF.md` documents an older V7 (standalone TAX INFORMATION section). `docs/rules.md` is authoritative — tax renders inside ORDER INFORMATION.
- **Multi-tenant**: existing data backfills into the `default` tenant; the seeded `ADMIN_EMAIL` is the default tenant's admin AND `is_platform_admin`. New tenants are provisioned via `POST /api/platform/tenants` (platform admin only). See `docs/multi-tenant-plan.md`.
- **Local dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://abstract_backend:3001` (the Docker service name). Outside Docker this hostname won't resolve — change it to `localhost:3001` or run the backend via docker-compose, or all API calls fail.
- **Pushing to `main` deploys to prod**: `build.yml` runs on every main push (validate → build/push ghcr.io images → trigger Portainer webhook) and also runs validate+build (no push/deploy) on PRs. On main, after the webhook fires it polls `https://abstract.builtnetworks.com/api/health` for up to 5 min. A `notify` job emails `ADMIN_EMAIL` on failure (needs `SMTP_*` + `ADMIN_EMAIL` secrets). There is no PR gate on the build workflow. CI installs with `--legacy-peer-deps`.
- **Security scans** run on main + PRs: gitleaks, trivy (SCA + images), semgrep, hadolint, compose/env audits (`.github/workflows/security.yml`).
- **Drizzle codegen**: `drizzle-kit` + `drizzle-orm` must stay in compatible lockstep (both hoisted to root `node_modules`). `npm run db:generate` in `backend/` shows "No schema changes" when schema and migrations are in sync. Do not reintroduce the old 0.30/0.45 mismatch.

## RTK (mandatory command prefix)

All shell commands MUST be prefixed with `rtk` (e.g. `rtk git status`, `rtk npm run validate`; prefix each command in a chain: `rtk git add . && rtk git commit -m "..."`). RTK v0.40.0+ is at `~/.local/bin/rtk.exe`. `rtk gain` shows token savings; `rtk discover` finds missed optimizations. Useful here: `rtk git*`, `rtk ls/read/grep/find`, `rtk npm run <script>`, `rtk gh *`.
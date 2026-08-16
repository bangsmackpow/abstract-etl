# AGENTS.md — Abstract ETL v3

AI-powered ETL system for property abstracts. **V7-only** (Enhanced Report). Read `docs/rules.md` before touching extraction or output formatting.

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

- `googleAiService.js` — primary AI engine. Native PDF pass-through to Gemini 2.5 Flash, structured JSON (`responseMimeType: "application/json"`), brace-depth JSON sanitization + fallback parse. Loads `docs/prompts/v7-prompt.md` and `docs/schemas/v7-schema.json` at startup (`DOCS_DIR`, default repo `docs/`) — server throws if either is missing.
- `v7PdfGenerator.js`, `v7DocxGenerator.js` (`generateV7TextDocx` text layout matching `blank.docx`, `generateV7TableDocx` table layout), `v7MarkdownGenerator.js` — v7 outputs. Tax info renders inside ORDER INFORMATION (no standalone section).
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
6. **templateVersion**: persisted as `v7`; all jobs render/export via v7 regardless of stored value. Review form is `frontend/src/components/V7Form.jsx`.
7. **Settings table** (key-value) overrides env at runtime. Update via `PATCH /api/admin/settings`.
8. **Backups**: snapshots in `backend/backups/` (volume `/app/backups`). Manual via admin UI or `POST /api/admin/backup`; restore via `POST /api/admin/backups/:id/restore`.
9. **Dead code**: all v1–v6 code is removed. Do not reintroduce legacy version dispatch, forms, or generators.
10. **Real data security**: never commit real abstracts, owner names, addresses, or confidential documents. Fictional samples go in `docs/sample_output/`; real-data dirs are gitignored (see `.gitignore`). `stack.env` is **tracked in git** — keep placeholders only, never real secrets (CI's `env-audit` warns on this).
11. **Docs policy**: extraction-rule, format, or major-architecture changes MUST update `docs/rules.md` (and this file when agent workflows change). Commit: `docs: update rules for [change description]`.

## Gotchas

- **Docs conflict**: `CUSTOMER_RULES_SIGNOFF.md` documents an older V7 (standalone TAX INFORMATION section). `docs/rules.md` is authoritative — tax renders inside ORDER INFORMATION.
- **Local dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://abstract_backend:3001` (the Docker service name). Outside Docker this hostname won't resolve — change it to `localhost:3001` or run the backend via docker-compose, or all API calls fail.
- **Pushing to `main` deploys to prod**: `build.yml` runs on every main push (validate → build/push ghcr.io images → trigger Portainer webhook). There is no PR gate on the build workflow. CI installs with `--legacy-peer-deps`.
- **Security scans** run on main + PRs: gitleaks, trivy (SCA + images), semgrep, hadolint, compose/env audits (`.github/workflows/security.yml`).

## RTK (mandatory command prefix)

All shell commands MUST be prefixed with `rtk` (e.g. `rtk git status`, `rtk npm run validate`; prefix each command in a chain: `rtk git add . && rtk git commit -m "..."`). RTK v0.40.0+ is at `~/.local/bin/rtk.exe`. `rtk gain` shows token savings; `rtk discover` finds missed optimizations. Useful here: `rtk git*`, `rtk ls/read/grep/find`, `rtk npm run <script>`, `rtk gh *`.
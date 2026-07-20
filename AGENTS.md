# Agent Guidelines (Development)

This project is a high-performance ETL system for property abstracts. Agents working on this project must adhere to the following standards.

## Tech Stack
- **Backend**: Node.js Express (CommonJS, moving to Hono/ESM).
- **Frontend**: React (Vite, ESM) + Zustand.
- **Hygiene**: ESLint 8 (Flat-ish), Prettier, Husky.
- **Validation**: Zod (Runtime environment checks).
- **Database**: SQLite (managed via Drizzle ORM).
- **AI**: Gemini 2.5 Flash (via direct `@google/generative-ai` SDK).

## Core Services
- `googleAiService.js`: **Primary AI Engine.** Handles native PDF pass-through for v1 (Legacy), v2 (ProTitleUSA), v4 (Hazelwood), v5 (Standard), and v6 (Enhanced) schemas. Uses Gemini 2.5 Flash with structured JSON output. Includes robust JSON sanitization with brace-depth tracking and fallback parsing. V5 schema follows clean format with 8 sections and ALL CAPS where practical. V6 extends V5 with additional fields, document accounting, and complete document review rules.
- `pdfGenerator.js`: Builds high-fidelity multi-page PDF reports (A4, Hazelwood branding) for v2 and v4 jobs. Uses linear rendering (no bufferPages) with auto page breaks. Includes Hazelwood logo at report header from `docs/logo/HazelwoodLogoFinal.png`. Footer positioned to avoid phantom blank pages. V4 PDF uses Times-Roman font family and section page breaks.
- `v5PdfGenerator.js`: Builds clean-format PDF reports for v5 and v6 jobs. 8 sections, standard fonts (Helvetica, Times-Roman), no Hazelwood branding. V6 extends V5 with additional fields (assessor_owner, assessor_description, acreage, loan_number, min, status, interest, costs, attorneys_fees, area_or_width) and document accounting.
- `docxGenerator.js`: Builds .docx files for v1, v2, v5, and v6 jobs. Routes to schema-specific generators via `templateVersion` parameter. V5 DOCX uses Arial font with 8-section table layout. V6 extends V5 with additional fields.
- `markdownGenerator.js`: Builds .md files for v1, v2, v4, v5, and v6 jobs. Routes to schema-specific generators via `templateVersion` parameter.
- `emailService.js`: Manages SMTP email notifications via nodemailer. Supports DB-overridden SMTP config (settings table). Sends completion emails, bulk import summaries, and backup failure alerts.
- `backupService.js`: Manages SQLite database backups. Supports manual trigger and scheduled auto-backup. Configurable interval and retention via settings table. Emails admin on failure.
- `env.js / env.ts`: Centralized Zod validation for process.env.

## Key Rules
1. **Hygiene First**: Never commit code that fails `npm run validate`.
2. **Schema Integrity**: Database changes -> `src/db/schema.js` -> `npm run db:generate`. New tables (`settings`, `backups`) are auto-created via raw SQL in `index.js` startup as a fallback.
3. **No Image Conversion**: The system now uses **Native PDF**. Do not use `pdf2pic` or `sharp` for extraction tasks.
4. **Native APIs**: Prefer standard Web APIs (fetch, crypto) over Node-specific ones to prepare for Cloudflare migration.
5. **JSON Mode**: AI must return structured JSON. Ensure `responseMimeType: "application/json"` is set in AI configs.
6. **templateVersion**: Jobs persist `templateVersion` in the database. Current values: `v1` (Legacy), `v2` (ProTitleUSA), `v4` (Hazelwood), `v5` (Standard), `v6` (Enhanced). All generators (PDF, DOCX, MD) must receive and route on `templateVersion`. V5 frontend uses `AbstractForm` with `V5Form` component. V6 frontend uses `AbstractForm` with `V6Form` component.
7. **Settings Table**: SMTP and backup config stored in `settings` table (key-value). DB values override env vars at runtime. Update via `PATCH /api/admin/settings`.
8. **Backups**: SQLite DB snapshots go to `backend/backups/`. Manual via admin UI or `POST /api/admin/backup`. Scheduled backup honors `backup_enabled`, `backup_interval_minutes`, `backup_retention_days` settings.
9. **Dead Code**: `backend/src/services/proTitleConstants.js` and `backend/src/test/generateV2Report.js` have been removed. Frontend `proTitleConstants.js` is still used by V1/V2 forms.
10. **Documentation Updates**: Any change to extraction rules (in `docs/rules.md`), new template versions, new output formats, or major architectural changes MUST be documented in `docs/rules.md` and this file. Commit with message: `docs: update rules for [change description]`.

## Documentation
- **`docs/rules.md`**: Single source of truth for extraction rules, output formatting, system architecture, and template versions. Updated whenever rules change or major features are added.
- **`AGENTS.md`**: Development guidelines for agents working on this project.

## Future Path (Cloudflare)
The project is currently in the **Hybrid Phase**. 
- Use Drizzle ORM exclusively for data access.
- Avoid libraries that require heavy Node.js binaries (like `sharp`).
- Keep code lightweight for edge deployment.

## RTK (Rust Token Killer) — Mandatory for All Operations
This project uses [RTK](https://github.com/rtk-ai/rtk) (v0.40.0+) for 60-90% LLM token reduction on all CLI operations.

### Setup
- RTK binary: `~/.local/bin/rtk.exe` (Windows) — already installed.
- All shell commands in this session MUST be prefixed with `rtk` (e.g., `rtk git status`, `rtk cargo test`).
- In command chains, prefix EACH command: `rtk git add . && rtk git commit -m "msg" && rtk git push`.
- Use `rtk gain` to view token savings. Use `rtk discover` to find missed optimization opportunities.

### Supported Commands (Key Ones for This Project)
| Category | Commands |
|----------|----------|
| Git | `rtk git status`, `rtk git log`, `rtk git diff`, `rtk git add`, `rtk git commit`, `rtk git push` |
| Files | `rtk ls`, `rtk read`, `rtk grep`, `rtk find` |
| Node.js | `rtk pnpm install`, `rtk npm run <script>`, `rtk lint`, `rtk tsc` |
| GitHub | `rtk gh pr view`, `rtk gh pr checks`, `rtk gh run list` |
| Docker | `rtk docker ps`, `rtk docker images`, `rtk docker logs` |
| Analysis | `rtk json`, `rtk deps`, `rtk log`, `rtk curl`, `rtk summary` |

### CI/CD RTK Commands
- `rtk git status` — compact branch status before pushes
- `rtk gh run list` — check workflow run status
- `rtk gh pr view <num>` — check PR details and checks

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
- `googleAiService.js`: **Primary AI Engine.** Handles native PDF pass-through for the v7 (Enhanced Report) schema. Uses Gemini 2.5 Flash with structured JSON output. Includes robust JSON sanitization with brace-depth tracking and fallback parsing. V7 uses a text-based report format with tax info rendered within ORDER INFORMATION (no standalone section), supporting documents for chain entries, multi-parcel order support, and extended field coverage.
- `v7PdfGenerator.js`: Builds clean-format PDF reports for v7 jobs. 8 sections, standard fonts, no Hazelwood branding. Text-based clean format, tax info merged into ORDER INFORMATION, compact comma-separated Names Searched.
- `v7DocxGenerator.js`: Builds .docx files for v7 jobs. Two generators: `generateV7TextDocx` (text-based layout matching blank.docx, tax info within ORDER INFORMATION) and `generateV7TableDocx` (table-based layout).
- `v7MarkdownGenerator.js`: Builds .md files for v7 jobs. Renders tax info within ORDER INFORMATION.
- `emailService.js`: Manages SMTP email notifications via nodemailer. Supports DB-overridden SMTP config (settings table). Sends completion emails, bulk import summaries, and backup failure alerts.
- `backupService.js`: Manages SQLite database backups. Supports manual trigger and scheduled auto-backup. Configurable interval and retention via settings table. Emails admin on failure.
- `env.js`: Centralized Zod validation for process.env.

## Key Rules
1. **Hygiene First**: Never commit code that fails `npm run validate`.
2. **Schema Integrity**: Database changes -> `src/db/schema.js` -> `npm run db:generate`. New tables (`settings`, `backups`) are auto-created via raw SQL in `index.js` startup as a fallback.
3. **No Image Conversion**: The system now uses **Native PDF**. Do not use `pdf2pic` or `sharp` for extraction tasks.
4. **Native APIs**: Prefer standard Web APIs (fetch, crypto) over Node-specific ones to prepare for Cloudflare migration.
5. **JSON Mode**: AI must return structured JSON. Ensure `responseMimeType: "application/json"` is set in AI configs.
6. **templateVersion**: Jobs persist `templateVersion` in the database. Current value: `v7` (Enhanced Report). All output is generated for v7 regardless of the stored value (legacy v1–v6 jobs render via v7). The frontend review form is `V7Form` (in `frontend/src/components/V7Form.jsx`).
7. **Settings Table**: SMTP and backup config stored in `settings` table (key-value). DB values override env vars at runtime. Update via `PATCH /api/admin/settings`.
8. **Backups**: SQLite DB snapshots go to `backend/backups/`. Manual via admin UI or `POST /api/admin/backup`. Scheduled backup honors `backup_enabled`, `backup_interval_minutes`, `backup_retention_days` settings.
9. **Dead Code**: All v1–v6 code has been removed. The app is v7-only. Do not reintroduce legacy version dispatch (`templateVersion` branching, V1/V2/V4/V5/V6 forms, or legacy generators).
10. **Real Data Security**: Never commit real property abstracts, owner names, addresses, or confidential documents to the repository. Sample files for reference go in `docs/sample_output/` with fully fictional data. Real-data dirs (`docs/samples/`, `docs/samples_05102026/`, `docs/04242026/`, `docs/05152026/`, `docs/v2_report/`, `docs/v7/*.pdf`, `docs/v7/*.docx` excluding `blank.docx`) are gitignored.
11. **Documentation Updates**: Any change to extraction rules (in `docs/rules.md`), new template versions, new output formats, or major architectural changes MUST be documented in `docs/rules.md` and this file. Commit with message: `docs: update rules for [change description]`.

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

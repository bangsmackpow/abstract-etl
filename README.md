# Abstract ETL Tool

AI-powered title abstract management system.

## Ports
| Service    | Host  | 
|------------|-------|
| Frontend   | 5173  |
| Backend    | 3001  |
| Database   | SQLite (internal) |

## Architecture
- **Frontend**: React (Vite) + Zustand
- **Backend**: Node.js Express (Industrial-grade TypeScript foundations)
- **Database**: SQLite with **WAL Mode** for high concurrency.
- **ORM**: Drizzle ORM
- **AI**: Google Gemini 2.5 Flash (Native PDF Pass-Through)
- **Validation**: Zod-powered runtime environment validation

## Workflow
1. Edit code in VSCode on your laptop
2. `git push` to GitHub
3. GitHub Actions builds and pushes Docker images to ghcr.io
4. GitHub Actions triggers Portainer Webhook to redeploy stack

## Environment Variables (.env)
| Key | Description |
|-----|-------------|
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `ADMIN_EMAIL` | Initial admin email created on first run; fallback for email notifications |
| `ADMIN_PASSWORD` | Initial admin password created on first run |
| `GOOGLE_AI_API_KEY` | Google Native AI Studio API Key (Required for Native PDF) |
| `APP_URL` | Base URL of the frontend (for emails) |
| `SMTP_HOST` | SMTP server host (optional — can be configured in Admin Settings) |
| `SMTP_PORT` | SMTP server port, default `587` (optional) |
| `SMTP_USER` | SMTP authentication user (optional) |
| `SMTP_PASS` | SMTP authentication password (optional) |
| `SMTP_FROM` | SMTP from address (optional) |

## Key Features
- **Dual-Version System**:
  - **v1 (Legacy)**: The original system for existing workflows.
  - **v2 (ProTitleUSA)**: A new, parallel system designed for the ProTitleUSA schema, featuring enhanced "Smart Suggestions" and high-fidelity multi-format output.
- **Native PDF Extraction**: Direct pass-through to Gemini 2.5 Flash. No image conversion required.
- **Professional Style Logic**: Semantic spouse formatting (`&` vs `,`), life estate syntax, and automated township city-inference.
- **Smart Chain Filtering**: Intelligent separation of numbered Insales and formatted Additional Information for Outsales/Encumbrances.
- **Intelligent Alternatives**: UI dropdowns allowing users to pick from multiple AI guesses and fuzzy-matched master lists.
- **Multi-Format Export**: 
  - **v1**: Generate professional Word (.docx) and Markdown (.md) reports.
  - **v2**: Generate high-fidelity PDF, Word (.docx), and Markdown (.md) reports. All formats include 12 sections: property info, vesting, chain of title, mortgages, associated documents, judgments/liens, misc documents, tax status, examiner instructions, legal description, names searched, and additional information.
- **PDF Features**: Dynamic multi-page generation with linear rendering (no `bufferPages`). Footer Y-position clamped to avoid phantom blank pages. Features Hazelwood branding (logo + header), 12-section report structure, and automatic page breaks via pdfkit text overflow.
- **JSON Robustness**: Brace-depth tracking and fallback parsing handles AI edge cases (trailing commas, extra text, code fences, mismatched quotes).
- **Customer Priority Rules**: Specialized extraction logic for File Numbers based on filename, company, and address.
- **Strict Hygiene**: ESLint, Prettier, and Husky safety gates enforced across the monorepo.
- **Admin Suite**:
    - **Abstract Deletion**: Admins can remove abstracts from Dashboard or Review pages.
    - **User Management**: Comprehensive RBAC and password management.
    - **Metrics**: Track average AI processing times and performance by person.
    - **Backup & Restore**: Manual and scheduled SQLite backups with configurable interval and retention. Live restore via `better-sqlite3.backup()` — no server restart required. Backup files persisted in Docker volume `backups_data`. Email alerts on failure.
    - **Email Notifications**: Completion emails, bulk import summaries, and backup failure alerts. SMTP configurable via env vars or Admin Settings UI (DB overrides env at runtime).
    - **Bulk Import**: Upload up to 50 PDFs at once. Each file is extracted via AI and saved as a draft job. Results summary emailed on completion.

## Deployment Setup

1. Copy `docker-compose.yml` and your environment variables to the server.
2. In Portainer, ensure the volumes `abstract_db_data` and `backups_data` are defined.
3. Ensure `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `GOOGLE_AI_API_KEY` are set.
4. (Optional) Set SMTP variables for email notifications, or configure them later in Admin Settings.
5. Deploy the stack.

## Auto-Deploy with Portainer
The project is configured with GitHub Actions to automatically redeploy on every push to `main`.
1. In Portainer: Stacks → your stack → Edit
2. Enable `Webhooks` and copy the URL.
3. In GitHub: Settings → Secrets → Actions → Add `PORTAINER_WEBHOOK_URL`.

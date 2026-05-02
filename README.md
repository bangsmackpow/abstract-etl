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
| `ADMIN_EMAIL` | Initial admin email created on first run |
| `ADMIN_PASSWORD` | Initial admin password created on first run |
| `GOOGLE_AI_API_KEY` | Google Native AI Studio API Key (Required for Native PDF) |
| `APP_URL` | Base URL of the frontend (for emails) |

## Key Features
- **Dual-Version System**:
  - **v1 (Legacy)**: The original system for existing workflows.
  - **v2 (ProTitleUSA)**: A new, parallel system designed for the ProTitleUSA schema, featuring enhanced "Smart Suggestions" and a high-fidelity PDF output.
- **Native PDF Extraction**: Direct pass-through to Gemini 1.5 Flash. No image conversion required.
- **Professional Style Logic**: Semantic spouse formatting (`&` vs `,`), life estate syntax, and automated township city-inference.
- **Smart Chain Filtering**: Intelligent separation of numbered Insales and formatted Additional Information for Outsales/Encumbrances.
- **Intelligent Alternatives**: UI dropdowns allowing users to pick from multiple AI guesses and fuzzy-matched master lists.
- **Multi-Format Export**: 
  - **v1**: Generate professional Word (.docx) and Markdown (.md) reports.
  - **v2**: Generate high-fidelity PDF, Word (.docx), and Markdown (.md) reports. PDFs include all sections: property info, vesting, chain of title, mortgages, tax status, examiner instructions, legal description, and names searched.
- **Customer Priority Rules**: Specialized extraction logic for File Numbers based on filename, company, and address.
- **Strict Hygiene**: ESLint, Prettier, and Husky safety gates enforced across the monorepo.
- **Admin Suite**:
    - **Abstract Deletion**: Admins can remove abstracts from Dashboard or Review pages.
    - **User Management**: Comprehensive RBAC and password management.
    - **Metrics**: Track average AI processing times and performance by person.

## Deployment Setup

1. Copy `docker-compose.yml` and your environment variables to the server.
2. In Portainer, ensure the volume `abstract_db_data` is defined.
3. Ensure `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `GOOGLE_AI_API_KEY` are set.
4. Deploy the stack.

## Auto-Deploy with Portainer
The project is configured with GitHub Actions to automatically redeploy on every push to `main`.
1. In Portainer: Stacks → your stack → Edit
2. Enable `Webhooks` and copy the URL.
3. In GitHub: Settings → Secrets → Actions → Add `PORTAINER_WEBHOOK_URL`.

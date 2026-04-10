# Abstract ETL Tool

AI-powered title abstract management system.

## Ports
| Service    | Host  | 
|------------|-------|
| Frontend   | 5173  |
| Backend    | 3003  |
| Database   | SQLite (internal) |

## Architecture
- **Frontend**: React (Vite)
- **Backend**: Node.js Express
- **Database**: SQLite with **WAL Mode** for high concurrency.
- **ORM**: Drizzle ORM
- **AI**: Google Gemini 1.5 Flash (via direct API or OpenRouter)

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
| `DB_PATH` | Path to SQLite database file |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `OPENROUTER_API_KEY` | OpenRouter API Key (if using OpenRouter) |
| `AI_PROVIDER` | `gemini` or `openrouter` |
| `AI_MODEL` | AI model ID (e.g., `google/gemini-flash-1.5-8b`) |
| `APP_URL` | Base URL of the frontend (for emails) |
| `SMTP_*` | Mail server configuration for notifications |

## Features
- **AI Extraction**: Automatically extracts property data from scanned PDF abstracts.
- **Batch Processing**: Handles large documents (e.g., 36+ pages) by processing in intelligent batches.
- **Admin Dashboard**:
    - **User Management**: Add users and reset passwords.
    - **Job Monitoring**: View and filter all jobs across the system.
    - **Metrics**: Track abstracts completed per person and average AI processing times.
- **Drizzle Studio**: Built-in database explorer (`npm run db:studio` in backend).

## Deployment Setup

1. Copy `docker-compose.yml` and your environment variables to the server.
2. In Portainer, ensure the volume `abstract_db_data` is defined.
3. Ensure `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are set in the Portainer Stack environment.
4. Deploy the stack.

## Auto-Deploy with Portainer
The project is configured with GitHub Actions to automatically redeploy on every push to `main`.
1. In Portainer: Stacks → your stack → Edit
2. Enable `Webhooks` and copy the URL.
3. In GitHub: Settings → Secrets → Actions → Add `PORTAINER_WEBHOOK_URL`.

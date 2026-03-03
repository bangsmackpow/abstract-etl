# Abstract ETL Tool

AI-powered title abstract management system.

## Ports
| Service    | Host  | 
|------------|-------|
| Frontend   | 5173  |
| Backend    | 3003  |
| PocketBase | 8093  |

## Workflow
1. Edit code in VSCode on your laptop
2. `git push` to GitHub
3. GitHub Actions builds and pushes Docker images to ghcr.io
4. In Portainer: pull latest images and redeploy stack

## First-Time Server Setup

1. SSH to server and create the stack directory:
```bash
mkdir -p /opt/docker/abstract-etl/pocketbase/pb_data
cd /opt/docker/abstract-etl
```

2. Copy `docker-compose.yml` and `stack.env` to the server.

3. Create `.env` from `stack.env`:
```bash
cp stack.env .env
nano .env  # fill in real values
```

4. Pull images and start:
```bash
docker compose pull
docker compose up -d
```

5. Open PocketBase at http://YOUR_SERVER:8093/_/ and:
   - Create superuser account
   - Add `role` field (Select: abstractor, admin) to users collection
   - Create jobs collection (see README for fields)
   - Create your first user

## PocketBase jobs Collection Fields
| Field            | Type                                      |
|------------------|-------------------------------------------|
| created_by       | Relation → users                          |
| status           | Select: draft, needs_review, complete     |
| property_address | Text                                      |
| borrower_names   | Text                                      |
| county           | Text                                      |
| order_date       | Date                                      |
| fields_json      | JSON                                      |
| ai_flags_json    | JSON                                      |
| template_version | Text                                      |
| email_sent       | Bool                                      |
| notes            | Text                                      |

API Rules: List/View/Create/Update: `@request.auth.id != ` | Delete: `@request.auth.role = admin`

## Auto-Deploy with Portainer (future)
To enable automatic redeployment when GitHub pushes a new image:
1. In Portainer: Stacks → your stack → Edit
2. Enable `Auto update` with webhook
3. Copy the webhook URL
4. In GitHub: Settings → Webhooks → Add webhook → paste URL
5. Now every `git push` automatically redeploys the stack

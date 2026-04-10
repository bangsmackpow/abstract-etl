# Project Status

## Current State
- **Architecture**: Migrated from PocketBase to SQLite + Drizzle ORM.
- **Authentication**: Custom JWT-based authentication with Bcrypt password hashing.
- **Database**: SQLite with WAL mode enabled for high performance. Persistent data stored in `/app/data/sqlite.db`.
- **Extraction**: AI extraction is operational using Gemini 1.5 Flash (direct or via OpenRouter). Intelligent batching (5 pages per batch) implemented for large documents.
- **Metrics**: Backend now tracks `processing_time_ms` for each AI extraction.
- **Admin**: New Admin Dashboard with User Management, Job Overview, and Performance Metrics (Abstracts per person, Avg. AI time).
- **Schema**: Extraction schema expanded to include:
    - Legal Description
    - Judgments / Liens
    - Names Searched
    - Miscellaneous Documents

## Recent Milestones
- [x] Removed PocketBase dependency.
- [x] Integrated Drizzle ORM.
- [x] Implemented local user authentication.
- [x] Built Admin Metrics & User Management UI.
- [x] Verified 100% PDF to Image conversion stability with GraphicsMagick.
- [x] Automated deployments via Portainer Webhooks.

## Active Blockers / Issues
- **AI 401 Errors**: Some OpenRouter keys are being rejected. Recommended to use `AI_PROVIDER=gemini` until key/balance issues are resolved.
- **Schema mismatch**: PocketBase v0.23+ field naming issues were resolved, but the app is now independent of PB.

## Roadmap
- [ ] **Batch Analysis**: Run the provided "training" documents through the system to compare AI output with the Word ground-truth.
- [ ] **Few-Shot Prompting**: Use the training data to improve extraction accuracy.
- [ ] **Cloudflare Migration**: Prepare for move to Cloudflare Workers + D1 (Drizzle already makes this easy).
- [ ] **UI Polish**: Improve mobile responsiveness of the new Admin Dashboard.

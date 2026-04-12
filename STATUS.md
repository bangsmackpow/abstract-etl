# Project Status

## Current State
- **Architecture**: Standalone SQLite + Drizzle ORM (Fully migrated from PocketBase).
- **Authentication**: Custom JWT-based auth with automatic Admin Sync from environment variables.
- **AI Engine**: Forced OpenRouter with `google/gemini-2.0-flash-001` for maximum stability and speed.
- **Accuracy**: Prompt refined based on associate feedback. Now handles full addresses, multi-page data (Deeds 1-6, Mortgages 1-5), and explicit In/Out Sale logic.
- **State Support**: Expanded schema for **North Carolina (NC)** and **Tennessee (TN)** including Excise Tax, Search Depth, and Marital Status.
- **Metrics**: Admin dashboard tracks total abstracts and average AI processing time per person.

## Recent Milestones
- [x] Unified frontend auth system.
- [x] Hardcoded OpenRouter stability fixes.
- [x] Expanded extraction schema & Word generation for NC/TN requirements.
- [x] Full cleanup of legacy PocketBase artifacts.

## Active Blockers / Issues
- None. System is stable and passing all startup tests.

## Roadmap
- [ ] **Batch Performance Analysis**: Test the full set of training PDFs to verify the impact of the new prompts.
- [ ] **Cloudflare Transition**: Finalize Hono + D1 adapter for serverless deployment.

# Agent Guidelines (Development)

This project is a high-performance ETL system for property abstracts. Agents working on this project must adhere to the following standards.

## Tech Stack
- **Backend**: Node.js Express (CommonJS, moving to Hono/ESM).
- **Frontend**: React (Vite, ESM) + Zustand.
- **Hygiene**: ESLint 8 (Flat-ish), Prettier, Husky.
- **Validation**: Zod (Runtime environment checks).
- **Database**: SQLite (managed via Drizzle ORM).
- **AI**: Gemini 1.5 Flash (via direct `@google/generative-ai` SDK).

## Core Services
- `googleAiService.js`: **Primary AI Engine.** Handles native PDF pass-through for both v1 (Legacy) and v2 (ProTitleUSA) schemas.
- `pdfGenerator.js`: Builds high-fidelity PDF reports for v2 jobs.
- `docxGenerator.js`: Builds .docx files for v1 jobs.
- `markdownGenerator.js`: Builds .md files for v1 jobs.
- `env.js / env.ts`: Centralized Zod validation for process.env.

## Key Rules
1. **Hygiene First**: Never commit code that fails `npm run validate`.
2. **Schema Integrity**: Database changes -> `src/db/schema.js` -> `npm run db:generate`.
3. **No Image Conversion**: The system now uses **Native PDF**. Do not use `pdf2pic` or `sharp` for extraction tasks.
4. **Native APIs**: Prefer standard Web APIs (fetch, crypto) over Node-specific ones to prepare for Cloudflare migration.
5. **JSON Mode**: AI must return structured JSON. Ensure `responseMimeType: "application/json"` is set in AI configs.

## Future Path (Cloudflare)
The project is currently in the **Hybrid Phase**. 
- Use Drizzle ORM exclusively for data access.
- Avoid libraries that require heavy Node.js binaries (like `sharp`).
- Keep code lightweight for edge deployment.

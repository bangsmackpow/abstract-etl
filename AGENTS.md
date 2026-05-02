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
- `googleAiService.js`: **Primary AI Engine.** Handles native PDF pass-through for both v1 (Legacy) and v2 (ProTitleUSA) schemas. Uses Gemini 2.5 Flash with structured JSON output. Includes robust JSON sanitization with brace-depth tracking and fallback parsing.
- `pdfGenerator.js`: Builds high-fidelity multi-page PDF reports for v2 jobs. Includes property info, vesting, chain of title, mortgages, tax status, examiner instructions, legal description, and names searched.
- `docxGenerator.js`: Builds .docx files for both v1 and v2 jobs. Routes to schema-specific generators via `templateVersion` parameter.
- `markdownGenerator.js`: Builds .md files for both v1 and v2 jobs. Routes to schema-specific generators via `templateVersion` parameter.
- `env.js / env.ts`: Centralized Zod validation for process.env.

## Key Rules
1. **Hygiene First**: Never commit code that fails `npm run validate`.
2. **Schema Integrity**: Database changes -> `src/db/schema.js` -> `npm run db:generate`.
3. **No Image Conversion**: The system now uses **Native PDF**. Do not use `pdf2pic` or `sharp` for extraction tasks.
4. **Native APIs**: Prefer standard Web APIs (fetch, crypto) over Node-specific ones to prepare for Cloudflare migration.
5. **JSON Mode**: AI must return structured JSON. Ensure `responseMimeType: "application/json"` is set in AI configs.
6. **templateVersion**: Jobs created as v2 must persist `templateVersion: 'v2'` in the database. All generators (PDF, DOCX, MD) must receive and route on `templateVersion`.

## Future Path (Cloudflare)
The project is currently in the **Hybrid Phase**. 
- Use Drizzle ORM exclusively for data access.
- Avoid libraries that require heavy Node.js binaries (like `sharp`).
- Keep code lightweight for edge deployment.

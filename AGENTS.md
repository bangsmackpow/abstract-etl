# Agent Guidelines (Development)

This project is a high-performance ETL system for property abstracts. Agents working on this project must adhere to the following standards.

## Tech Stack
- **Backend**: Node.js Express (REST API).
- **Database**: SQLite (managed via Drizzle ORM).
- **ORM**: Drizzle ORM (Schema in `backend/src/db/schema.js`).
- **Auth**: Custom JWT (logic in `backend/src/services/authService.js`).
- **Frontend**: React (Vite) + Zustand for state management.
- **AI**: Gemini 1.5 Flash (via `@google/generative-ai` or `openai` for OpenRouter).

## Core Services
- `aiService.js`: The primary entry point for document extraction. Handles PDF conversion and batching.
- `geminiService.js`: Direct Google Gemini implementation.
- `openRouterService.js`: OpenRouter / OpenAI SDK implementation.
- `docxGenerator.js`: Programmatically builds .docx files from extracted JSON.

## Key Rules
1. **Schema Integrity**: Any changes to the database must be done through `src/db/schema.js` and followed by `npx drizzle-kit generate` to keep migrations in sync.
2. **Batching**: Always process images in batches (max 5-10) to avoid payload timeouts or model context limits.
3. **Security**: Never hardcode secrets. Always use environment variables.
4. **Auth**: Any new route that requires a user must use the `requireAuth` middleware. Any administrative route must use `requireAdmin`.
5. **JSON Consistency**: The AI must return raw JSON. Always include the JSON schema in the system prompt.

## Future Path (Cloudflare)
The project is being architected to move to **Cloudflare Workers**. 
- Prefer lightweight dependencies.
- Use Drizzle ORM exclusively for data access (it translates easily to D1).
- Avoid Node-specific APIs where possible (e.g., prefer `fetch` over `axios` in new code).

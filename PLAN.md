# Development Plan

## Immediate Tasks
- [ ] **Batch Analysis Script**: Create a Node.js utility to:
    - Iterate through all PDFs in `docs/samples/`.
    - Run the current AI extraction.
    - Compare the output with the text in the corresponding `.docx` files.
    - Output an accuracy report.
- [ ] **System Prompt Optimization**:
    - Incorporate "Few-Shot" examples from the analysis into `geminiService.js` and `openRouterService.js`.
    - Refine the instructions for `legal_description` and `judgments_liens` based on failure patterns.

## Secondary Tasks
- [ ] **Frontend Polish**:
    - Add a "Confirm" step in the Admin Dashboard before deleting users.
    - Add data visualization (charts) for metrics if requested.
    - Improve error messaging when AI extraction fails.
- [ ] **Drizzle Studio Integration**:
    - Update `docker-compose.yml` to optionally expose Drizzle Studio on a specific port.

## Long-Term Goals
- [ ] **Cloudflare Workers Migration**:
    - Swap Express for Hono.
    - Switch from local SQLite to Cloudflare D1.
    - Move file uploads to Cloudflare R2 or similar.
- [ ] **Multi-Model Voting**:
    - Implement a "best-of-three" extraction where results from two different models (e.g., Gemini and Llama) are merged for maximum accuracy.

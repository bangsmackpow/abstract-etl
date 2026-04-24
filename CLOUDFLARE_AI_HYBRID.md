# Cloudflare Hybrid AI Strategy

This document outlines the strategic plan to move the Abstract ETL stack to Cloudflare while optimizing AI extraction accuracy by using a hybrid approach for native PDF processing.

## 1. Research Findings

### OpenRouter & Native PDF
- **Limitation:** OpenRouter does not support native PDF pass-through to Gemini. 
- **Mechanism:** It requires a `file-parser` plugin that converts PDFs to Markdown/Text *before* reaching the model.
- **Impact:** This is **unacceptable** for our use case as it destroys spatial reasoning, stamps, marginalia, and layout context required for 100% accurate abstracts.

### Cloudflare Workers AI
- **Capability:** Offers native `ai.toMarkdown()` utilities.
- **Limitation:** Similar to OpenRouter, it is a parsing-first approach. While fast, it lacks the raw multimodal "vision" capabilities of a native multimodal model processing the original file structure.

## 2. The Hybrid Recommendation

To achieve "Industrial Grade" foundations while maintaining "Best-in-Class" extraction, we will adopt the following architecture:

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Compute** | **Cloudflare Workers (Hono)** | Edge performance and near-zero cold starts. |
| **Database** | **Cloudflare D1 (SQLite)** | Native Cloudflare SQL; 100% compatible with our current Drizzle setup. |
| **File Storage** | **Cloudflare R2** | Durable, fast, and cost-effective storage for PDF uploads. |
| **Frontend** | **Cloudflare Pages** | Integrated global distribution and CI/CD. |
| **AI Extraction** | **Google Vertex AI / AI Studio** | **Native PDF Pass-Through.** By bypassing OpenRouter and using the direct `@google/generative-ai` SDK, we send the raw PDF directly to Gemini. |

## 3. Advantages of Native PDF Pass-Through

By switching to direct Google integration for the AI engine:
1. **Simplified Pipeline:** Remove the entire "PDF-to-Image" conversion logic (`pdf2pic`, `graphicsmagick`, `ghostscript`).
2. **Visual Reasoning:** Gemini 2.5 handles the OCR and layout analysis internally, preserving accuracy for handwritten notes and complex legal tables.
3. **Reduced Latency:** Removing the local image conversion step significantly speeds up the total "Time-to-Review."
4. **Massive Context:** Gemini natively handles massive PDFs (up to 2M tokens) without the need for manual page-by-batch management.

## 4. Implementation Roadmap

### Phase A: Direct AI Integration (Immediate)
- Switch `backend/src/services/aiService.js` from OpenRouter to `@google/generative-ai`.
- Refactor extraction to send raw PDF blobs instead of JPEG batches.
- **Goal:** Verify that accuracy matches or exceeds current image-based workflow.

### Phase B: Cloudflare Migration (Phase 3)
- Refactor Express routes to **Hono**.
- Switch `better-sqlite3` adapter to `drizzle-orm/d1`.
- Replace local `fs` storage with **Cloudflare R2** bindings.
- Deploy to Cloudflare Pages/Workers.

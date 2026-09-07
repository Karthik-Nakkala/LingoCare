# Lingocare — Curriculum Creation Engine

A dual-mode (manual + AI-assisted) curriculum editor built with Vite + React + Express.

## Local Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Add your Gemini API key in `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   API_PORT=8788
   ```
   *Note: Do NOT prefix with `VITE_`. The API key is used strictly server-side.*

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server (Frontend + Local Express API):
   ```bash
   npm run dev
   ```

The client runs on `http://localhost:5173` and proxies API requests to `http://127.0.0.1:8788`.

## Architecture & Production Hardening

- **Gemini Integration**: Calls Gemini via `@google/genai` (defaulting to `gemini-2.5-flash`) with structured schema constraints.
- **Client-Side PDF Text Extraction**: Uses `pdfjs-dist` to extract clean page text in the browser. Raw PDF files never leave the browser.
- **Strict Data Isolation**: AI drafts remain in `generatedCurriculumDraft` until the user explicitly clicks **Replace current curriculum**.
- **Error Resilience & Safety**:
  - Exponential backoff retries for transient network failures (`ECONNRESET`, `ETIMEDOUT`).
  - 30-second server timeout (`AI_TIMEOUT`).
  - Concurrent request locking (`DUPLICATE_REQUEST`).
  - Rate-limit handling (`AI_RATE_LIMITED`).
  - Quality analysis & duplicate detection (flagging duplicate modules/topics/lessons & inferred content for review).
  - React `ErrorBoundary` wrapper for UI crash prevention.

## Build for Production

```bash
npm run build
```

Generates production static bundle under `dist/`.

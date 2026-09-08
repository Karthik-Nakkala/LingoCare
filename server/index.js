// server/index.js – production-hardened Express server & static asset host
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { buildCurriculumPrompt } from "./geminiPrompt.js";
import {
  curriculumResponseSchema,
  curriculumGeminiSchema,
  GEMINI_MODEL,
  MAX_DOCUMENT_CHARACTERS,
  normalizeCurriculumOutput,
} from "./curriculumSchema.js";
import {
  analyzeCurriculumQuality,
  validateCurriculumOutput,
} from "./curriculumValidation.js";

// Load .env.local first, then default .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

const app = express();
app.use(express.json({ limit: "12mb" }));

// Safe CORS middleware for local development
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Serve static frontend assets from dist in production
app.use(express.static(distPath));

// Standard client error responder
function clientError(res, status, errorCode, userMessage) {
  return res.status(status).json({ success: false, errorCode, userMessage });
}

// In-flight request lock to prevent concurrent duplicate generation requests on server
let isGenerating = false;

// Transient network error codes safe to retry
const retryableNetworkCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

// Classify whether a Gemini/network error is worth retrying
function isRetryable(error) {
  const code =
    error?.cause?.code ||
    error?.code ||
    (typeof error?.status === 'number' ? String(error.status) : undefined);
  // 429 = rate limit, 503 = upstream unavailable — both retryable
  if (code === '429' || code === '503') return true;
  if (retryableNetworkCodes.has(code)) return true;
  const msg = error?.message || '';
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('UNAVAILABLE')) return true;
  return false;
}

async function generateWithRetry(ai, request, signal, tracker) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("AI_TIMEOUT");
    }
    if (tracker) tracker.attempt = attempt + 1;
    try {
      return await ai.models.generateContent({
        ...request,
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError" || error?.message === "AI_TIMEOUT") {
        throw new Error("AI_TIMEOUT");
      }
      if (!isRetryable(error) || attempt === maxAttempts - 1) throw error;
      // Exponential backoff with jitter: ~700ms, ~1400ms
      const base = 700 * (attempt + 1);
      const jitter = Math.floor(Math.random() * 300);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, base + jitter);
        if (signal) {
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("AI_TIMEOUT"));
            },
            { once: true }
          );
        }
      });
    }
  }
}

// Map internal / Gemini exceptions to user-safe contract
function mapGeminiError(error) {
  if (error?.message === 'AI_TIMEOUT' || error?.name === 'AbortError') {
    return {
      status: 504,
      errorCode: 'AI_TIMEOUT',
      userMessage: 'AI generation took too long to respond. Please try again.',
    };
  }

  const code =
    error?.cause?.code ||
    error?.code ||
    (typeof error?.status === 'number' ? String(error.status) : undefined);
  const msg = error?.message || '';

  if (code === '429' || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      errorCode: 'AI_RATE_LIMITED',
      userMessage: 'AI generation is busy right now. Please try again shortly.',
    };
  }

  // 503 from Gemini upstream = service unavailable (retries already exhausted)
  if (code === '503' || msg.includes('UNAVAILABLE') || retryableNetworkCodes.has(code)) {
    return {
      status: 503,
      errorCode: 'AI_UNAVAILABLE',
      userMessage: 'AI generation is temporarily unavailable. Please try again in a moment.',
    };
  }

  return {
    status: 502,
    errorCode: 'GENERATION_FAILED',
    userMessage: "AI couldn't generate a curriculum from this document. Please try again.",
  };
}

app.post("/api/generate-curriculum", async (req, res) => {
  const document = req.body;

  // 1. Guard against duplicate concurrent requests
  if (isGenerating) {
    return clientError(
      res,
      429,
      "DUPLICATE_REQUEST",
      "AI generation is already in progress. Please wait for the current request to finish.",
    );
  }

  // 2. Input document shape validation
  if (
    !document ||
    typeof document.fileName !== "string" ||
    !Array.isArray(document.pages) ||
    typeof document.fullText !== "string"
  ) {
    return clientError(
      res,
      400,
      "INVALID_DOCUMENT",
      "The extracted PDF content is incomplete. Please upload the document again.",
    );
  }

  if (!document.fullText.trim()) {
    return clientError(
      res,
      400,
      "NO_EXTRACTABLE_TEXT",
      "We couldn't find readable text in this PDF.",
    );
  }

  if (document.fullText.length > MAX_DOCUMENT_CHARACTERS) {
    return clientError(
      res,
      413,
      "DOCUMENT_TOO_LARGE",
      "This document is too large to process at once. Please use a smaller PDF.",
    );
  }

  // 3. Environment check
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Server] GEMINI_API_KEY is not set in environment.");
    return clientError(
      res,
      503,
      "AI_NOT_CONFIGURED",
      "AI generation is currently unavailable.",
    );
  }

  isGenerating = true;

  // 4. Server-side deadline (90 seconds maximum bounded timeout)
  const timeoutMs = 90_000;
  const startTime = Date.now();
  const tracker = { attempt: 0 };
  const controller = new AbortController();

  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      const elapsed = Date.now() - startTime;
      console.error(
        `[Timeout Diagnostic] Gemini generation timed out after ${elapsed}ms | documentChars=${document.fullText.length} | model=${GEMINI_MODEL} | attemptCount=${tracker.attempt}`
      );
      reject(new Error("AI_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const generationCall = generateWithRetry(
      ai,
      {
        model: GEMINI_MODEL,
        contents: buildCurriculumPrompt(document),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: curriculumGeminiSchema,
          thinkingConfig: { thinkingLevel: 'low' },
        },
      },
      controller.signal,
      tracker
    );

    const result = await Promise.race([generationCall, timeoutPromise]);
    clearTimeout(timeoutHandle);

    const rawText = result?.text || "";
    const textReturned = Boolean(rawText && rawText.trim());
    console.log(`[Diagnostic] Gemini returned text: ${textReturned}`);
    if (textReturned) {
      console.log(`[Diagnostic] Generated JSON preview (first 2000 chars):\n${rawText.slice(0, 2000)}`);
    }

    let parsed = {};
    try {
      parsed = JSON.parse(rawText || "{}");
      console.log(`[Diagnostic] JSON.parse succeeded: true`);
      console.log(`[Diagnostic] Top-level keys: [${Object.keys(parsed || {}).join(', ')}]`);
    } catch (parseErr) {
      console.error(`[Diagnostic] JSON.parse succeeded: false - Error: ${parseErr.message}`);
      return clientError(
        res,
        422,
        "MALFORMED_AI_OUTPUT",
        "AI returned an invalid response format. Please try again.",
      );
    }

    // Zod Schema Validation Diagnostic
    const zodResult = curriculumResponseSchema.safeParse(parsed);
    console.log(`[Diagnostic] Zod validation success: ${zodResult.success}`);
    if (!zodResult.success) {
      console.log(`[Diagnostic] Zod validation issues count: ${zodResult.error.issues.length}`);
      zodResult.error.issues.forEach((issue, idx) => {
        console.log(
          `  Issue #${idx + 1}: path="${issue.path.join('.') || '(root)'}" | code=${issue.code} | expected="${issue.expected}" | received="${issue.received}" | message="${issue.message}"`
        );
      });
    }

    // Normalize first to assign IDs and safe defaults
    const normalized = normalizeCurriculumOutput(parsed);

    // Validate structural rules
    const validation = validateCurriculumOutput(normalized);
    console.log(`[Diagnostic] Structural validation success: ${validation.valid}`);
    if (!validation.valid) {
      console.log(`[Diagnostic] Structural validation issues count: ${validation.issues.length}`);
      validation.issues.forEach((iss, idx) => {
        console.log(`  Structural Issue #${idx + 1}: path="${iss.path}" | message="${iss.message}"`);
      });
      return clientError(
        res,
        422,
        "INVALID_GENERATED_STRUCTURE",
        "We couldn't safely interpret the generated curriculum structure.",
      );
    }

    // Analyze quality and flags
    const quality = analyzeCurriculumQuality(normalized);

    // Check for NO MEANINGFUL CURRICULUM
    if (normalized.modules.length === 0 || quality.topicsFound === 0) {
      return clientError(
        res,
        422,
        "NO_MEANINGFUL_CURRICULUM",
        "We couldn't confidently identify a curriculum structure in this document.",
      );
    }

    return res.json({
      success: true,
      curriculum: normalized,
      metadata: {
        sourceFileName: document.fileName,
        modulesFound: normalized.modules.length,
        ...quality,
      },
    });
  } catch (error) {
    console.error("Gemini generation failed:", error.message || error);
    const mapped = mapGeminiError(error);
    return clientError(
      res,
      mapped.status,
      mapped.errorCode,
      mapped.userMessage,
    );
  } finally {
    clearTimeout(timeoutHandle);
    isGenerating = false;
  }
});

// SPA Fallback for production client routing (Middleware fallback for Express 5)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();

  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next(err);
  });
});

// Centralized Express error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server exception:", err);
  if (res.headersSent) return next(err);
  return clientError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "An unexpected server error occurred. Please try again.",
  );
});

const port = Number(process.env.PORT || process.env.API_PORT || 8788);

const server = app.listen(port, "0.0.0.0", () => {
  console.log(
    `Lingocare engine running on port ${port} (Model: ${GEMINI_MODEL})`,
  );
});

server.on("error", (err) => {
  console.error("[Server] Critical socket / startup error:", err);
  process.exit(1);
});

const handleShutdown = (signal) => {
  console.log(`[Server] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log("[Server] Express HTTP server closed gracefully.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

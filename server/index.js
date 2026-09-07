// server/index.js – production-hardened Express server & static asset host
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { buildCurriculumPrompt } from "./geminiPrompt.js";
import {
  curriculumResponseSchema,
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

async function generateWithRetry(ai, request) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      const code =
        error?.cause?.code ||
        error?.code ||
        (error?.status?.toString && error.status.toString());
      if (code === "429" || retryableNetworkCodes.has(code)) {
        if (attempt === maxAttempts - 1) throw error;
        // Exponential backoff: 700ms, 1400ms
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}

// Map internal / Gemini exceptions to user-safe contract
function mapGeminiError(error) {
  if (error?.message === "AI_TIMEOUT") {
    return {
      status: 504,
      errorCode: "AI_TIMEOUT",
      userMessage: "AI generation took too long to respond. Please try again.",
    };
  }

  const code =
    error?.cause?.code ||
    error?.code ||
    (error?.status?.toString && error.status.toString());

  if (code === "429" || error?.message?.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      errorCode: "AI_RATE_LIMITED",
      userMessage: "AI generation is busy right now. Please try again shortly.",
    };
  }

  if (retryableNetworkCodes.has(code)) {
    return {
      status: 503,
      errorCode: "AI_NETWORK_UNAVAILABLE",
      userMessage:
        "AI generation is temporarily unavailable. Please check your connection and try again.",
    };
  }

  return {
    status: 502,
    errorCode: "GENERATION_FAILED",
    userMessage:
      "AI couldn't generate a curriculum from this document. Please try again.",
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

  // 4. Server-side timeout (30 seconds)
  const timeoutMs = 30_000;
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("AI_TIMEOUT")),
      timeoutMs,
    );
  });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const generationCall = generateWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: buildCurriculumPrompt(document),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: curriculumResponseSchema,
        temperature: 0.15,
      },
    });

    const result = await Promise.race([generationCall, timeoutPromise]);
    clearTimeout(timeoutHandle);

    let parsed = {};
    try {
      parsed = JSON.parse(result.text || "{}");
    } catch {
      return clientError(
        res,
        422,
        "MALFORMED_AI_OUTPUT",
        "AI returned an invalid response format. Please try again.",
      );
    }

    // Normalize first to assign IDs and safe defaults
    const normalized = normalizeCurriculumOutput(parsed);

    // Validate structural rules
    const validation = validateCurriculumOutput(normalized);
    if (!validation.valid) {
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

// SPA Fallback for production client routing
app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();

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
app.listen(port, "0.0.0.0", () => {
  console.log(
    `Lingocare engine running on port ${port} (Model: ${GEMINI_MODEL})`,
  );
});

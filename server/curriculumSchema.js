// server/curriculumSchema.js – canonical schema, model definition, normalization and quality analysis
import { z } from 'zod';

export const MAX_DOCUMENT_CHARACTERS = 200000; // approx 200k characters (~30–40 pages)

// Gemini Model Configuration - single source of truth for backend
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Allowed provenance values for any curriculum item
export const provenanceEnum = z.enum(['pdf', 'ai-inferred', 'user-edited']);

export const curriculumResponseSchema = z.object({
  title: z.string(),
  modules: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      source: provenanceEnum.optional(),
      topics: z.array(
        z.object({
          id: z.string().optional(),
          title: z.string(),
          description: z.string().optional(),
          source: provenanceEnum.optional(),
          lessons: z.array(
            z.object({
              id: z.string().optional(),
              title: z.string(),
              description: z.string().optional(),
              source: provenanceEnum.optional(),
            })
          ),
        })
      ),
    })
  ),
});

/**
 * Normalizes a raw curriculum object returned by Gemini.
 * – Trims whitespace
 * – Generates UUIDs for missing IDs
 * – Ensures valid provenance source (defaulting to "ai-inferred" for missing/invalid generated sources)
 * – Preserves exact canonical structure (title, description, source, children)
 * – Strips extraneous unknown properties
 */
export function normalizeCurriculumOutput(raw) {
  if (!raw || typeof raw !== 'object') return { title: '', modules: [] };
  const safeId = () => `ai-${crypto.randomUUID()}`;
  
  const parseSource = (src) => (provenanceEnum.safeParse(src).success ? src : 'ai-inferred');

  return {
    title: (typeof raw.title === 'string' ? raw.title : '').trim(),
    modules: Array.isArray(raw.modules)
      ? raw.modules.map((mod) => ({
          id: typeof mod.id === 'string' && mod.id.trim() ? mod.id.trim() : safeId(),
          title: (typeof mod.title === 'string' ? mod.title : '').trim(),
          description: (typeof mod.description === 'string' ? mod.description : '').trim(),
          source: parseSource(mod.source),
          topics: Array.isArray(mod.topics)
            ? mod.topics.map((top) => ({
                id: typeof top.id === 'string' && top.id.trim() ? top.id.trim() : safeId(),
                title: (typeof top.title === 'string' ? top.title : '').trim(),
                description: (typeof top.description === 'string' ? top.description : '').trim(),
                source: parseSource(top.source),
                lessons: Array.isArray(top.lessons)
                  ? top.lessons.map((les) => ({
                      id: typeof les.id === 'string' && les.id.trim() ? les.id.trim() : safeId(),
                      title: (typeof les.title === 'string' ? les.title : '').trim(),
                      description: (typeof les.description === 'string' ? les.description : '').trim(),
                      source: parseSource(les.source),
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  };
}

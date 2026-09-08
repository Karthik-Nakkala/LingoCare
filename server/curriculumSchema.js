// server/curriculumSchema.js – canonical schema, model definition, normalization and quality analysis
import { z } from 'zod';

export const MAX_DOCUMENT_CHARACTERS = 200000; // approx 200k characters (~30–40 pages)

// Gemini Model Configuration - single source of truth for backend
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

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

// OpenAPI JSON Schema for @google/genai responseJsonSchema configuration
export const curriculumGeminiSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Curriculum title' },
    modules: {
      type: 'ARRAY',
      description: 'List of modules in the curriculum',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Optional unique identifier' },
          title: { type: 'STRING', description: 'Module title' },
          description: { type: 'STRING', description: 'Module description' },
          source: { type: 'STRING', enum: ['pdf', 'ai-inferred', 'user-edited'] },
          topics: {
            type: 'ARRAY',
            description: 'List of topics within this module',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'Optional unique identifier' },
                title: { type: 'STRING', description: 'Topic title' },
                description: { type: 'STRING', description: 'Topic description' },
                source: { type: 'STRING', enum: ['pdf', 'ai-inferred', 'user-edited'] },
                lessons: {
                  type: 'ARRAY',
                  description: 'List of lessons within this topic',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING', description: 'Optional unique identifier' },
                      title: { type: 'STRING', description: 'Lesson title' },
                      description: { type: 'STRING', description: 'Lesson description' },
                      source: { type: 'STRING', enum: ['pdf', 'ai-inferred', 'user-edited'] },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['title'],
            },
          },
        },
        required: ['title'],
      },
    },
  },
  required: ['title', 'modules'],
};

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

  const titleStr = typeof raw.title === 'string' ? raw.title : (typeof raw.name === 'string' ? raw.name : '');
  const rawModules = Array.isArray(raw.modules) ? raw.modules : (Array.isArray(raw.units) ? raw.units : []);

  return {
    title: titleStr.trim(),
    modules: rawModules.map((mod) => {
      const modTitle = typeof mod.title === 'string' ? mod.title : (typeof mod.name === 'string' ? mod.name : '');
      const rawTopics = Array.isArray(mod.topics) ? mod.topics : (Array.isArray(mod.sections) ? mod.sections : []);
      return {
        id: typeof mod.id === 'string' && mod.id.trim() ? mod.id.trim() : safeId(),
        title: modTitle.trim(),
        description: (typeof mod.description === 'string' ? mod.description : '').trim(),
        source: parseSource(mod.source),
        topics: rawTopics.map((top) => {
          const topTitle = typeof top.title === 'string' ? top.title : (typeof top.name === 'string' ? top.name : '');
          const rawLessons = Array.isArray(top.lessons) ? top.lessons : (Array.isArray(top.items) ? top.items : []);
          return {
            id: typeof top.id === 'string' && top.id.trim() ? top.id.trim() : safeId(),
            title: topTitle.trim(),
            description: (typeof top.description === 'string' ? top.description : '').trim(),
            source: parseSource(top.source),
            lessons: rawLessons.map((les) => {
              const lesTitle = typeof les.title === 'string' ? les.title : (typeof les.name === 'string' ? les.name : '');
              return {
                id: typeof les.id === 'string' && les.id.trim() ? les.id.trim() : safeId(),
                title: lesTitle.trim(),
                description: (typeof les.description === 'string' ? les.description : '').trim(),
                source: parseSource(les.source),
              };
            }),
          };
        }),
      };
    }),
  };
}

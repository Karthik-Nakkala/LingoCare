export function buildCurriculumPrompt(document) {
  return `You are a curriculum-structure extraction assistant. Convert this educational PDF text into an editable hierarchy of curriculum → modules → topics → lessons.

Rules:
- Preserve source headings and wording whenever recognizable.
- Use source "pdf" for content directly supported by the document.
- Use source "ai-inferred" only to fill a structurally necessary gap grounded in nearby source content.
- Never add unrelated subject matter, facts, or references.
- Keep titles concise and descriptions factual and concise.
- If no meaningful educational curriculum can be identified, do not fabricate one.
- Return only the schema-constrained structured result.

Source file: ${document.fileName}; pages: ${document.pageCount}

PDF text:
${document.fullText}`;
}

export async function generateCurriculumFromDocument(document) {
  const response = await fetch('/api/generate-curriculum', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The generation service returned an invalid response. Please try again.');
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.userMessage || "AI couldn't generate a curriculum from this document. Please try again.");
  }
  return payload;
}

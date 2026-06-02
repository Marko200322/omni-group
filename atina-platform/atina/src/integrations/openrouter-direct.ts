export function parseRecommendationsFromContent(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { recommendations?: unknown };
      if (Array.isArray(parsed.recommendations)) {
        return parsed.recommendations
          .map((r) => String(r).trim())
          .filter(Boolean)
          .slice(0, 8);
      }
    }
  } catch {
    /* fall through to line split */
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[\d\-*•.)]+\s*/, '').trim())
    .filter((line) => line.length > 8)
    .slice(0, 6);
}

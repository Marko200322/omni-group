/**
 * Validates a post-login redirect target. Allows same-origin relative paths only;
 * blocks protocol-relative (`//…`), absolute URLs, and backslash paths.
 */
export function safeInternalPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== 'string') return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('://') || trimmed.includes('\\')) return null;
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || decoded.includes('://') || decoded.includes('\\')) return null;
  } catch {
    return null;
  }
  return trimmed;
}

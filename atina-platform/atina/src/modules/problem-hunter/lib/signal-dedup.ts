import crypto from 'crypto';

/** Stable prefix for cross-source duplicate detection (same company + problem gist). */
export function problemDedupPrefix(detectedProblem: string): string {
  return detectedProblem.trim().toLowerCase().slice(0, 120);
}

export function problemDedupFingerprint(problemCategory: string | null | undefined, detectedProblem: string): string {
  const cat = (problemCategory ?? '').trim().toLowerCase();
  const body = detectedProblem.trim().toLowerCase().slice(0, 400);
  return crypto.createHash('sha256').update(`${cat}|${body}`).digest('hex').slice(0, 32);
}

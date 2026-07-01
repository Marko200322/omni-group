/** Passed into AI generators and handlers during fulfillment (memory + QA retry). */
export type FulfillmentGenerationHints = {
  memoryHints?: string[];
  retryNotes?: string;
  attemptNumber?: number;
};

export function mergeHintsIntoPayload(
  payload: Record<string, unknown>,
  hints?: FulfillmentGenerationHints,
): Record<string, unknown> {
  if (!hints) return payload;
  const merged = { ...payload };
  if (hints.memoryHints?.length) {
    merged.priorSuccessPatterns = hints.memoryHints.slice(0, 8);
  }
  if (hints.retryNotes?.trim()) {
    merged.qaCorrectionNotes = hints.retryNotes.trim();
  }
  if (hints.attemptNumber && hints.attemptNumber > 1) {
    merged.retryAttempt = hints.attemptNumber;
  }
  return merged;
}

import type { OrderIdentity } from './order-identity';

/** Passed into AI generators and handlers during fulfillment (memory + QA retry). */
export type FulfillmentGenerationHints = {
  memoryHints?: string[];
  retryNotes?: string;
  attemptNumber?: number;
  /** Binds generated copy to this payment/job so orders are not identical. */
  orderIdentity?: OrderIdentity;
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
  if (hints.orderIdentity) {
    merged.orderIdentity = hints.orderIdentity;
    merged.orderMustBeUnique = true;
    merged.instruction =
      `Tailor every section to order ${hints.orderIdentity.shortRef} ` +
      `(payment ${hints.orderIdentity.paymentId}). Do not emit a generic template reusable for another payment.`;
  }
  return merged;
}

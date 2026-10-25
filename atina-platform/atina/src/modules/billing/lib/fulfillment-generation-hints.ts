import type { OrderIdentity } from './order-identity';

/** Client/order-specific brief so two buyers never get identical pack prose. */
export type UniquenessBrief = {
  clientName: string;
  industryLabel: string;
  primaryProblem: string;
  secondaryProblems: string[];
  industryPainPoints: string[];
  businessOutcome: string;
};

/** Passed into AI generators and handlers during fulfillment (memory + QA retry). */
export type FulfillmentGenerationHints = {
  memoryHints?: string[];
  retryNotes?: string;
  attemptNumber?: number;
  /** Binds generated copy to this payment/job so orders are not identical. */
  orderIdentity?: OrderIdentity;
  /** Industry × package problems + client name — mandatory uniqueness seed. */
  uniquenessBrief?: UniquenessBrief;
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
  if (hints.uniquenessBrief) {
    merged.uniquenessBrief = hints.uniquenessBrief;
    merged.clientMustBeNamed = hints.uniquenessBrief.clientName;
    merged.mustSolveProblems = [
      hints.uniquenessBrief.primaryProblem,
      ...hints.uniquenessBrief.secondaryProblems.slice(0, 6),
    ];
    merged.industryPainPoints = hints.uniquenessBrief.industryPainPoints.slice(0, 6);
  }
  if (hints.orderIdentity) {
    merged.orderIdentity = hints.orderIdentity;
    merged.orderMustBeUnique = true;
    const client = hints.uniquenessBrief?.clientName ?? 'this client';
    merged.instruction =
      `Write a UNIQUE deliverable for ${client}, order ${hints.orderIdentity.shortRef} ` +
      `(payment ${hints.orderIdentity.paymentId}). ` +
      `Every major section must name ${client} and reference order ${hints.orderIdentity.shortRef}. ` +
      `Solve the listed mustSolveProblems with industry-specific actions — not generic portal/CRM fluff. ` +
      `Do NOT emit prose that could be copy-pasted to another buyer or industry.`;
  }
  return merged;
}

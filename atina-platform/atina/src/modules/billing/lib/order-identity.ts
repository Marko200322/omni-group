import { createHash } from 'crypto';
import type { StructuredDeliverableDoc } from '../service/deliverable-document-generator.service';

/** Stable short ref unique per payment/job — embedded in client deliverables. */
export function shortOrderRef(paymentId: string, jobId: string): string {
  const p = paymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'PAY';
  const j = jobId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'JOB';
  return `ORD-${p}-${j}`;
}

export type OrderIdentity = {
  paymentId: string;
  jobId: string;
  shortRef: string;
};

export function buildOrderIdentity(paymentId: string, jobId: string): OrderIdentity {
  return {
    paymentId,
    jobId,
    shortRef: shortOrderRef(paymentId, jobId),
  };
}

/** Fingerprint of deliverable body text for cross-order comparison. */
export function contentFingerprint(blob: string): string {
  return createHash('sha256').update(blob).digest('hex').slice(0, 20);
}

export function docBodyBlob(doc: StructuredDeliverableDoc): string {
  return [doc.title, doc.subtitle ?? '', ...doc.sections.map((s) => `${s.heading}\n${s.body}`)].join(
    '\n',
  );
}

/**
 * Bind a structured doc to this paid order so two payments never share identical scope text.
 * Idempotent if the shortRef is already present.
 */
export function bindDocToOrder(
  doc: StructuredDeliverableDoc,
  identity: OrderIdentity,
  clientName: string,
): StructuredDeliverableDoc {
  const blob = docBodyBlob(doc);
  if (blob.includes(identity.shortRef)) return doc;
  const scopeBody = [
    `This deliverable is scoped to order **${identity.shortRef}** for **${clientName}**.`,
    '',
    `- Payment id: \`${identity.paymentId}\``,
    `- Fulfillment job: \`${identity.jobId}\``,
    `- Do not reuse findings verbatim for another payment — rediscover against this order’s intake.`,
    '',
    'Kickoff questions unique to this order (owner + evidence):',
    `1. What changed in ${clientName}'s stack since the last engagement (order ${identity.shortRef})?`,
    `2. Which KPI must move first within 30 days for order ${identity.shortRef}?`,
    `3. Who approves go-live for payment ${identity.paymentId.slice(0, 8)}…?`,
  ].join('\n');
  return {
    ...doc,
    subtitle: doc.subtitle?.includes(identity.shortRef)
      ? doc.subtitle
      : `${doc.subtitle ? `${doc.subtitle} · ` : ''}${identity.shortRef}`,
    sections: [
      ...doc.sections,
      {
        heading: 'Order delivery scope',
        body: scopeBody,
      },
    ],
  };
}

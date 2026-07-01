import type { FulfillmentGenerationHints } from '../fulfillment-generation-hints';

export type FulfillmentEnqueueInput = {
  paymentId: string;
  userId: string;
  purchaseType: 'deliverable' | 'platform_plan';
  deliverableId?: string | null;
  planSlug?: string | null;
  industryCategory?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
};

export type FulfillmentContext = {
  paymentId: string;
  userId: string;
  deliverableId: string;
  jobId: string;
  clientName: string;
  clientEmail?: string | null;
  industryCategory?: string | null;
  planSlug?: string | null;
  purchaseType: 'deliverable' | 'platform_plan';
  /** Memory + QA retry hints injected by DeliverableFulfillmentService. */
  generationHints?: FulfillmentGenerationHints;
};

export type FulfillmentArtifact = {
  type: string;
  filename: string;
  storagePath: string;
  downloadLabel?: string;
};

export type FulfillmentResult = {
  projectId?: string;
  publicUrl?: string | null;
  artifacts: FulfillmentArtifact[];
  status: 'completed' | 'partial';
  metadata?: Record<string, unknown>;
};

export interface DeliverableFulfillmentHandler {
  readonly ids: readonly string[];
  fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult>;
}

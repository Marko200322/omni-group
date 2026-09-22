import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import { setupFulfillmentHandler } from './setup.handler';
import { websiteFulfillmentHandler } from './website.handler';
import { consultingDocFulfillmentHandler } from './consulting-doc.handler';
import { growthFulfillmentHandler } from './vertical-growth.handler';

type BundleStep = { deliverableId: string; handler: DeliverableFulfillmentHandler };

const BUNDLE_STEPS: Record<string, BundleStep[]> = {
  'bundle-portal-presence': [
    { deliverableId: 'setup-quick', handler: setupFulfillmentHandler },
    { deliverableId: 'landing', handler: websiteFulfillmentHandler },
  ],
  'bundle-sales-launch': [
    { deliverableId: 'landing', handler: websiteFulfillmentHandler },
    { deliverableId: 'sales-enablement', handler: growthFulfillmentHandler },
  ],
  'bundle-ops-clarity': [
    { deliverableId: 'audit', handler: consultingDocFulfillmentHandler },
    { deliverableId: 'workflow-design', handler: consultingDocFulfillmentHandler },
  ],
};

function mergeResults(parts: FulfillmentResult[]): FulfillmentResult {
  const artifacts = parts.flatMap((p) => p.artifacts);
  const metadata: Record<string, unknown> = { bundleParts: parts.length };
  for (const p of parts) {
    if (p.publicUrl) metadata.publicUrl = p.publicUrl;
    if (p.projectId) metadata.projectId = p.projectId;
    if (p.metadata) Object.assign(metadata, p.metadata);
  }
  const failed = parts.find((p) => p.status !== 'completed');
  return {
    artifacts,
    status: failed ? failed.status : 'completed',
    publicUrl: parts.find((p) => p.publicUrl)?.publicUrl ?? null,
    projectId: parts.find((p) => p.projectId)?.projectId,
    metadata,
  };
}

export const bundleFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['bundle-portal-presence', 'bundle-sales-launch', 'bundle-ops-clarity'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    const steps = BUNDLE_STEPS[ctx.deliverableId];
    if (!steps?.length) {
      return { artifacts: [], status: 'partial', metadata: { reason: 'unknown_bundle' } };
    }
    const parts: FulfillmentResult[] = [];
    for (const step of steps) {
      const part = await step.handler.fulfill({ ...ctx, deliverableId: step.deliverableId });
      parts.push(part);
      if (part.status !== 'completed') break;
    }
    return mergeResults(parts);
  },
};

import type { DeliverableFulfillmentHandler, FulfillmentContext, FulfillmentResult } from './types';
import { setupFulfillmentHandler } from './setup.handler';
import { websiteFulfillmentHandler } from './website.handler';
import { consultingDocFulfillmentHandler } from './consulting-doc.handler';
import { growthFulfillmentHandler } from './vertical-growth.handler';
import {
  BUNDLE_EXPECTED_STEPS,
  expectedBundleStepIds,
  mergeBundleResults,
  summarizeBundleStep,
} from './bundle-steps';
import logger from '../../../../utils/logger';

export {
  BUNDLE_EXPECTED_STEPS,
  expectedBundleStepIds,
  mergeBundleResults,
  summarizeBundleStep,
} from './bundle-steps';
export type { BundleStepResult } from './bundle-steps';

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

function assertStepsMatchCatalog(bundleId: string): void {
  const expected = BUNDLE_EXPECTED_STEPS[bundleId] ?? [];
  const wired = (BUNDLE_STEPS[bundleId] ?? []).map((s) => s.deliverableId);
  if (expected.join('|') !== wired.join('|')) {
    throw new Error(
      `Bundle step mismatch for ${bundleId}: expected [${expected.join(', ')}] wired [${wired.join(', ')}]`,
    );
  }
}

export const bundleFulfillmentHandler: DeliverableFulfillmentHandler = {
  ids: ['bundle-portal-presence', 'bundle-sales-launch', 'bundle-ops-clarity'] as const,

  async fulfill(ctx: FulfillmentContext): Promise<FulfillmentResult> {
    assertStepsMatchCatalog(ctx.deliverableId);
    const steps = BUNDLE_STEPS[ctx.deliverableId];
    if (!steps?.length) {
      return {
        artifacts: [],
        status: 'partial',
        metadata: {
          reason: 'unknown_bundle',
          bundleId: ctx.deliverableId,
          expectedSteps: [],
          bundleSteps: [],
          bundleParts: 0,
        },
      };
    }

    const expectedIds = expectedBundleStepIds(ctx.deliverableId);
    const parts: FulfillmentResult[] = [];
    const stepResults = [];

    // Run every child step (do not skip remaining on failure) so aggregation is honest.
    for (const step of steps) {
      try {
        const part = await step.handler.fulfill({ ...ctx, deliverableId: step.deliverableId });
        parts.push(part);
        stepResults.push(summarizeBundleStep(step.deliverableId, part));
        if (part.status !== 'completed') {
          logger.warn('Bundle child step returned non-completed status', {
            bundleId: ctx.deliverableId,
            stepId: step.deliverableId,
            status: part.status,
            paymentId: ctx.paymentId,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Bundle child step threw', {
          bundleId: ctx.deliverableId,
          stepId: step.deliverableId,
          paymentId: ctx.paymentId,
          error: message,
        });
        const failed: FulfillmentResult = {
          artifacts: [],
          status: 'partial',
          metadata: {
            stepError: message,
            deliverableId: step.deliverableId,
          },
        };
        parts.push(failed);
        stepResults.push(summarizeBundleStep(step.deliverableId, failed, message));
      }
    }

    return mergeBundleResults(ctx.deliverableId, expectedIds, parts, stepResults);
  },
};

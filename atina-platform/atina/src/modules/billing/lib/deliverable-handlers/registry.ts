import { resolveBaseDeliverableId } from '../industry-package-id';
import type { DeliverableFulfillmentHandler } from './types';
import { websiteFulfillmentHandler } from './website.handler';
import { consultingDocFulfillmentHandler } from './consulting-doc.handler';
import { setupFulfillmentHandler } from './setup.handler';
import { retainerFulfillmentHandler } from './retainer.handler';
import {
  verticalPackFulfillmentHandler,
  growthFulfillmentHandler,
} from './vertical-growth.handler';
import { customSoftwareFulfillmentHandler } from './custom-software.handler';
import { bundleFulfillmentHandler } from './bundle.handler';

const HANDLERS: DeliverableFulfillmentHandler[] = [
  websiteFulfillmentHandler,
  consultingDocFulfillmentHandler,
  setupFulfillmentHandler,
  retainerFulfillmentHandler,
  verticalPackFulfillmentHandler,
  growthFulfillmentHandler,
  customSoftwareFulfillmentHandler,
  bundleFulfillmentHandler,
];

const BY_ID = new Map<string, DeliverableFulfillmentHandler>();
for (const handler of HANDLERS) {
  for (const id of handler.ids) {
    BY_ID.set(id, handler);
  }
}

/**
 * Resolve handler for base or industry package ids (`landing__healthcare` → landing handler).
 * Returns a wrapper that fulfills with the base deliverableId so handler.ids checks still match.
 */
export function resolveDeliverableFulfillmentHandler(
  deliverableId: string,
): DeliverableFulfillmentHandler | null {
  const raw = deliverableId.trim();
  const baseId = resolveBaseDeliverableId(raw);
  const handler = BY_ID.get(baseId) ?? null;
  if (!handler) return null;
  if (baseId === raw) return handler;
  return {
    ids: handler.ids,
    async fulfill(ctx) {
      return handler.fulfill({ ...ctx, deliverableId: baseId });
    },
  };
}

export function listDeliverableFulfillmentHandlers(): DeliverableFulfillmentHandler[] {
  return [...HANDLERS];
}

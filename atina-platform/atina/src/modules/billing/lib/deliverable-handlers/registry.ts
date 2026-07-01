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

const HANDLERS: DeliverableFulfillmentHandler[] = [
  websiteFulfillmentHandler,
  consultingDocFulfillmentHandler,
  setupFulfillmentHandler,
  retainerFulfillmentHandler,
  verticalPackFulfillmentHandler,
  growthFulfillmentHandler,
  customSoftwareFulfillmentHandler,
];

const BY_ID = new Map<string, DeliverableFulfillmentHandler>();
for (const handler of HANDLERS) {
  for (const id of handler.ids) {
    BY_ID.set(id, handler);
  }
}

export function resolveDeliverableFulfillmentHandler(
  deliverableId: string,
): DeliverableFulfillmentHandler | null {
  return BY_ID.get(deliverableId.trim()) ?? null;
}

export function listDeliverableFulfillmentHandlers(): DeliverableFulfillmentHandler[] {
  return [...HANDLERS];
}

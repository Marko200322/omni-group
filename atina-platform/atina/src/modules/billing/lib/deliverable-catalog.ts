/**
 * Sellable deliverable catalog.
 * - BASE (20): fulfillment capability templates
 * - FULL (~1000): first-class industry packages (each solves 5–10 problems)
 */
import {
  BASE_DELIVERABLE_CATALOG,
  BASE_DELIVERABLE_CATALOG_HONEST,
  BASE_DELIVERABLE_COUNT,
  getBaseDeliverable,
  listBaseDeliverables,
  type DeliverableBilling,
  type DeliverableDefinition,
  type ResourceProfile,
} from './base-deliverable-catalog';
import { resolveBaseDeliverableId } from './industry-package-id';
import {
  buildThousandPackageCatalog,
  TARGET_PACKAGE_COUNT,
  thousandPackageCatalogStats,
} from './thousand-package-catalog';

export type { DeliverableBilling, DeliverableDefinition, ResourceProfile };
export {
  BASE_DELIVERABLE_CATALOG,
  BASE_DELIVERABLE_CATALOG_HONEST,
  BASE_DELIVERABLE_COUNT,
  getBaseDeliverable,
  listBaseDeliverables,
  TARGET_PACKAGE_COUNT,
  thousandPackageCatalogStats,
};

/**
 * Base templates (20). Phase-honest descriptions/anchors are applied via
 * getPackageDeliverySpec / getPackageAnchorEur at quote time — not at module init
 * (avoids factory-phase require cycles under Vitest).
 */
export const DELIVERABLE_CATALOG: DeliverableDefinition[] = BASE_DELIVERABLE_CATALOG;

/** Full sellable catalog: ~1000 industry-specific packages. */
export function listFullPackageCatalog(): DeliverableDefinition[] {
  return buildThousandPackageCatalog();
}

export const FULL_PACKAGE_CATALOG: DeliverableDefinition[] = buildThousandPackageCatalog();

const FULL_BY_ID = new Map<string, DeliverableDefinition>();
for (const d of FULL_PACKAGE_CATALOG) FULL_BY_ID.set(d.id, d);
for (const d of DELIVERABLE_CATALOG) {
  if (!FULL_BY_ID.has(d.id)) FULL_BY_ID.set(d.id, d);
}

export function getDeliverable(id: string): DeliverableDefinition | null {
  const key = id.trim();
  return FULL_BY_ID.get(key) ?? getBaseDeliverable(key);
}

/**
 * Public sellable list — industry packages (~1000).
 * Pass `{ includeBase: true }` to also include legacy base template IDs.
 */
export function listDeliverables(
  category?: DeliverableDefinition['category'],
  opts?: { includeBase?: boolean },
): DeliverableDefinition[] {
  const industryPackages = buildThousandPackageCatalog();
  const list = opts?.includeBase
    ? [...BASE_DELIVERABLE_CATALOG_HONEST, ...industryPackages]
    : industryPackages;
  if (!category) return [...list];
  return list.filter((d) => d.category === category);
}

export function resolveFulfillmentDeliverableId(deliverableId: string): string {
  return resolveBaseDeliverableId(deliverableId);
}

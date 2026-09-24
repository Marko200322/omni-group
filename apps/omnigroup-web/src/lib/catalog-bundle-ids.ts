/** Bundle SKUs inside the one public catalog — not a second product book. */
export const CATALOG_BUNDLE_IDS = [
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
] as const;

export type CatalogBundleId = (typeof CATALOG_BUNDLE_IDS)[number];

export function isCatalogBundle(id: string): boolean {
  return (CATALOG_BUNDLE_IDS as readonly string[]).includes(id);
}

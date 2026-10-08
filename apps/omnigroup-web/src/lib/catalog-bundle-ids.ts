/** Bundle SKUs inside the one public catalog — not a second product book. */
export const CATALOG_BUNDLE_IDS = [
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
] as const;

export type CatalogBundleId = (typeof CATALOG_BUNDLE_IDS)[number];

export function isCatalogBundle(id: string): boolean {
  const key = id.trim();
  if ((CATALOG_BUNDLE_IDS as readonly string[]).includes(key as CatalogBundleId)) return true;
  const sep = key.indexOf('__');
  if (sep <= 0) return false;
  return (CATALOG_BUNDLE_IDS as readonly string[]).includes(key.slice(0, sep) as CatalogBundleId);
}

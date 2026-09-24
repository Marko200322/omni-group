/**
 * Public launch bundles — the same three catalog SKUs as Pricing / Products / Services.
 * Prices always come from getPublicListPriceEur. No second price book.
 */
import { getClientOffer, getPublicListPriceEur, type ClientOffer } from './client-offers';
import { CATALOG_BUNDLE_IDS } from './catalog-bundle-ids';

export { CATALOG_BUNDLE_IDS } from './catalog-bundle-ids';

export type LaunchBundleSpec = {
  id: (typeof CATALOG_BUNDLE_IDS)[number];
  contactTopic: string;
};

export const LAUNCH_BUNDLE_SPECS: LaunchBundleSpec[] = CATALOG_BUNDLE_IDS.map((id) => ({
  id,
  contactTopic: id,
}));

export type ResolvedLaunchBundle = LaunchBundleSpec & {
  offer: ClientOffer;
  title: string;
  description: string;
  bundleEur: number;
  listEur: number;
  savingsEur: number;
};

export function resolveLaunchBundles(): ResolvedLaunchBundle[] {
  const rows: ResolvedLaunchBundle[] = [];
  for (const spec of LAUNCH_BUNDLE_SPECS) {
    const offer = getClientOffer(spec.id);
    if (!offer) continue;
    const listEur = getPublicListPriceEur(spec.id);
    rows.push({
      ...spec,
      offer,
      title: offer.name,
      description: offer.summary,
      bundleEur: listEur,
      listEur,
      savingsEur: 0,
    });
  }
  return rows;
}

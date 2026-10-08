import { INDUSTRY_CATEGORIES } from './category-pricing';
import {
  BASE_DELIVERABLE_CATALOG,
  FULL_PACKAGE_CATALOG,
} from './deliverable-catalog';
import { getGeneratedVerticalsIndex, listOnlineVerticalEntries } from './generated-verticals';

/** Real counts for marketing copy — not rounded marketing fluff. */
export function getPublicCatalogStats() {
  const index = getGeneratedVerticalsIndex();
  const online = listOnlineVerticalEntries().length;
  return {
    industryGroups: INDUSTRY_CATEGORIES.length,
    /** Base fulfillment capability templates */
    basePackages: BASE_DELIVERABLE_CATALOG.length,
    /** First-class sellable industry packages (~1000) */
    sellablePackages: FULL_PACKAGE_CATALOG.length,
    /** Vertical slugs with `hasPage` in generated-verticals-index.json */
    verticalLandings: online,
    /** Total rows in index (includes offline / pipeline entries) */
    verticalIndexTotal: index.count,
  };
}

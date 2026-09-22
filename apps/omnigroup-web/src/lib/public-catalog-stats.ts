import { INDUSTRY_CATEGORIES } from './category-pricing';
import { getGeneratedVerticalsIndex, listOnlineVerticalEntries } from './generated-verticals';

/** Real counts for marketing copy — not rounded marketing fluff. */
export function getPublicCatalogStats() {
  const index = getGeneratedVerticalsIndex();
  const online = listOnlineVerticalEntries().length;
  return {
    industryGroups: INDUSTRY_CATEGORIES.length,
    /** Vertical slugs with `hasPage` in generated-verticals-index.json */
    verticalLandings: online,
    /** Total rows in index (includes offline / pipeline entries) */
    verticalIndexTotal: index.count,
  };
}

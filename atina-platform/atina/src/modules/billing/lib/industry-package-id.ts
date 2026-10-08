/**
 * Industry package IDs are first-class catalog SKUs:
 *   `{baseDeliverableId}__{industrySlug}`
 * Example: `landing__healthcare`, `audit__legal_services`
 */
import { getBaseDeliverable } from './base-deliverable-catalog';
import { getIndustryCategory } from './category-pricing';

export const INDUSTRY_PACKAGE_SEP = '__';

export type ParsedIndustryPackageId = {
  baseDeliverableId: string;
  industrySlug: string;
};

export function buildIndustryPackageId(baseDeliverableId: string, industrySlug: string): string {
  return `${baseDeliverableId.trim()}${INDUSTRY_PACKAGE_SEP}${industrySlug.trim()}`;
}

export function parseIndustryPackageId(deliverableId: string): ParsedIndustryPackageId | null {
  const raw = deliverableId.trim();
  const idx = raw.indexOf(INDUSTRY_PACKAGE_SEP);
  if (idx <= 0) return null;
  const baseDeliverableId = raw.slice(0, idx);
  const industrySlug = raw.slice(idx + INDUSTRY_PACKAGE_SEP.length);
  if (!baseDeliverableId || !industrySlug) return null;
  if (!getBaseDeliverable(baseDeliverableId)) return null;
  if (!getIndustryCategory(industrySlug)) return null;
  return { baseDeliverableId, industrySlug };
}

/**
 * Resolve fulfillment engine id (base) from a base or industry package id.
 * Split-only (no catalog lookup) so delivery-spec can import without cycles.
 */
export function resolveBaseDeliverableId(deliverableId: string): string {
  const raw = deliverableId.trim();
  const idx = raw.indexOf(INDUSTRY_PACKAGE_SEP);
  if (idx <= 0) return raw;
  return raw.slice(0, idx);
}

/** Industry locked into an industry package id, else null. */
export function industrySlugFromDeliverableId(deliverableId: string): string | null {
  const raw = deliverableId.trim();
  const idx = raw.indexOf(INDUSTRY_PACKAGE_SEP);
  if (idx <= 0) return null;
  const industrySlug = raw.slice(idx + INDUSTRY_PACKAGE_SEP.length);
  return industrySlug || null;
}

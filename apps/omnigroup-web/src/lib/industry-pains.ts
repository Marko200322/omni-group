import CATEGORY_PAINS_JSON from './industry-pains.json';

export const GENERIC_PAINS = [
  'leads sit in inboxes instead of a pipeline',
  'invoices and delivery status live in different tools',
  'handoffs between sales and fulfillment get lost',
  'support questions repeat because nothing is documented',
  'reporting is a spreadsheet rebuilt every Friday',
  'new hires cannot see what the last project promised',
  'quotes stall while someone hunts for the latest price list',
  'clients ask for status because there is no portal',
  'renewals surprise the team because dates live in chat',
  'operations still copy data between CRM and billing',
] as const;

export const CATEGORY_PAINS: Record<string, string[]> = CATEGORY_PAINS_JSON;

export function normalizeIndustryPainKey(category: string): string {
  return category.trim().toLowerCase().replace(/-/g, '_');
}

export function painsForCategory(category: string): { pains: string[]; sourced: 'category' | 'generic' } {
  const raw = category.trim().toLowerCase();
  const normalized = normalizeIndustryPainKey(raw);
  if (CATEGORY_PAINS[raw]?.length) return { pains: CATEGORY_PAINS[raw], sourced: 'category' };
  if (CATEGORY_PAINS[normalized]?.length) return { pains: CATEGORY_PAINS[normalized], sourced: 'category' };
  return { pains: [...GENERIC_PAINS], sourced: 'generic' };
}

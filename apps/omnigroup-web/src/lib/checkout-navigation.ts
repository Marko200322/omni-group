/** Shared checkout URL contract: query params on /dashboard, hash for section anchor. */

export type QuoteCheckoutParams = {
  service: string;
  category?: string;
  vertical?: string;
};

export function buildDashboardQuoteHref(params: QuoteCheckoutParams): string {
  const q = new URLSearchParams({ service: params.service });
  if (params.category) q.set('category', params.category);
  if (params.vertical) q.set('vertical', params.vertical);
  return `/dashboard?${q.toString()}#quote`;
}

export function buildLoginNextForQuote(params: QuoteCheckoutParams): string {
  return `/login?next=${encodeURIComponent(buildDashboardQuoteHref(params))}`;
}

export function buildPricingHref(params: QuoteCheckoutParams): string {
  const q = new URLSearchParams({ service: params.service });
  if (params.category) q.set('category', params.category);
  if (params.vertical) q.set('vertical', params.vertical);
  return `/pricing?${q.toString()}`;
}

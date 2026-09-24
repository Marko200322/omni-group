/** Shared checkout URL contract: query params on the new-order workspace route. */

export type QuoteCheckoutParams = {
  service: string;
  category?: string;
  vertical?: string;
};

export function buildDashboardQuoteHref(params: QuoteCheckoutParams): string {
  const q = new URLSearchParams({ service: params.service });
  if (params.category) q.set('category', params.category);
  if (params.vertical) q.set('vertical', params.vertical);
  return `/dashboard/order?${q.toString()}`;
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

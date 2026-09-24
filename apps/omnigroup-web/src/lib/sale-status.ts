/** One availability enum for every public CTA, card, landing, and checkout gate. */
export type OfferSaleStatus = 'READY_TO_BUY' | 'COMING_SOON' | 'REQUEST_QUOTE';

export function saleStatusFromFlags(input: {
  checkoutAllowed: boolean;
  quoteOnly?: boolean;
}): OfferSaleStatus {
  if (input.quoteOnly) return 'REQUEST_QUOTE';
  return input.checkoutAllowed ? 'READY_TO_BUY' : 'COMING_SOON';
}

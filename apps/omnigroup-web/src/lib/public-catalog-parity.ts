import { DELIVERABLE_CATALOG } from './deliverable-catalog';
import { getClientOffer, getPublicListPriceEur, publicOfferWhen } from './client-offers';
import { buildDeliverableCatalogCategories } from './deliverable-catalog-ui';
import { SERVICE_CATEGORIES, withPhaseServiceCatalog } from './marketing-catalog';
import { calculateDeliverableQuote } from './dynamic-pricing';

/** Returns human-readable mismatches. Empty array = public catalog is consistent. */
export function findPublicCatalogMismatches(): string[] {
  const errors: string[] = [];

  for (const d of DELIVERABLE_CATALOG) {
    const offer = getClientOffer(d.id);
    if (!offer) {
      errors.push(`missing public offer for ${d.id}`);
      continue;
    }
    const list = getPublicListPriceEur(d.id);
    if (offer.priceEur !== list) {
      errors.push(`${d.id} offer.priceEur ${offer.priceEur} != list ${list}`);
    }
    if (d.anchorEur !== list) {
      errors.push(`${d.id} catalog.anchorEur ${d.anchorEur} != list ${list}`);
    }
    if (offer.name !== d.name) {
      errors.push(`${d.id} name "${offer.name}" != catalog "${d.name}"`);
    }
    if (offer.billing !== d.billing) {
      errors.push(`${d.id} billing "${offer.billing}" != catalog "${d.billing}"`);
    }
    if (offer.billingPeriod !== d.billing) {
      errors.push(`${d.id} billingPeriod "${offer.billingPeriod}" != catalog "${d.billing}"`);
    }
    if (offer.currency !== 'EUR') {
      errors.push(`${d.id} currency "${offer.currency}" != EUR`);
    }
    if (offer.slug !== d.id) {
      errors.push(`${d.id} slug "${offer.slug}" != id`);
    }
    if (offer.checkoutEnabled !== (offer.saleStatus === 'READY_TO_BUY')) {
      errors.push(`${d.id} checkoutEnabled ${offer.checkoutEnabled} != READY_TO_BUY`);
    }
    const quote = calculateDeliverableQuote({
      deliverableId: d.id,
      marketIntensity: 55,
      tamEstimateUsd: 50_000 + 55 * 1200,
      competitionScore: Math.min(100, 30 + Math.round(55 / 2)),
    });
    if (quote.clientPriceEur === list && quote.clientPriceEur !== getPublicListPriceEur(d.id)) {
      errors.push(`${d.id} quote engine collided with a non-list price`);
    }
    if (offer.priceEur === quote.clientPriceEur && quote.clientPriceEur !== list) {
      errors.push(`${d.id} public offer used quote-engine price ${quote.clientPriceEur} instead of list ${list}`);
    }
    if (d.id === 'setup-quick' && list === quote.clientPriceEur && quote.clientPriceEur !== 549) {
      errors.push(`setup-quick list was replaced by the M6 quote-engine price ${list}`);
    }
    if (!['READY_TO_BUY', 'COMING_SOON', 'REQUEST_QUOTE'].includes(offer.saleStatus)) {
      errors.push(`${d.id} unknown saleStatus ${offer.saleStatus}`);
    }
    if (offer.saleStatus === 'READY_TO_BUY') {
      if (!offer.buyHref.includes('/login?next=') || !offer.buyHref.includes('/dashboard/order')) {
        errors.push(`${d.id} READY_TO_BUY missing checkout route: ${offer.buyHref}`);
      }
      if (!offer.buyHref.includes(`service=${encodeURIComponent(d.id)}`)) {
        errors.push(`${d.id} checkout route missing service id`);
      }
    }
    if (offer.saleStatus === 'COMING_SOON') {
      if (offer.buyHref.includes('/dashboard/order')) {
        errors.push(`${d.id} COMING_SOON still points at checkout`);
      }
      if (!offer.contactHref.startsWith('/contact')) {
        errors.push(`${d.id} COMING_SOON must use the contact/notify flow`);
      }
    }
    if (offer.saleStatus === 'REQUEST_QUOTE') {
      if (offer.buyHref.includes('/dashboard/order')) {
        errors.push(`${d.id} REQUEST_QUOTE still points at self-serve checkout`);
      }
      if (!offer.contactHref.startsWith('/contact')) {
        errors.push(`${d.id} REQUEST_QUOTE must use the quote/contact flow`);
      }
    }
    const when = publicOfferWhen(offer.when, offer.saleStatus, offer.billing);
    if (offer.saleStatus === 'READY_TO_BUY' && /opens for checkout|when package is open/i.test(when)) {
      errors.push(`${d.id} READY_TO_BUY still says checkout is closed`);
    }
    if (offer.saleStatus === 'COMING_SOON' && offer.availability.checkoutAllowed) {
      errors.push(`${d.id} COMING_SOON but checkoutAllowed`);
    }
    if (offer.saleStatus === 'READY_TO_BUY' && !offer.availability.checkoutAllowed) {
      errors.push(`${d.id} READY_TO_BUY but checkout is closed`);
    }
    if (offer.saleStatus !== offer.availability.saleStatus) {
      errors.push(`${d.id} offer.saleStatus ${offer.saleStatus} != availability ${offer.availability.saleStatus}`);
    }
    if (offer.saleStatus === 'REQUEST_QUOTE' && offer.availability.checkoutAllowed) {
      errors.push(`${d.id} REQUEST_QUOTE still allows checkout`);
    }
  }

  for (const cat of buildDeliverableCatalogCategories()) {
    for (const item of cat.items) {
      const list = getPublicListPriceEur(item.id);
      const n = item.priceOnce ?? item.priceMonthly;
      if (n != null && n !== list) {
        errors.push(`catalog-ui ${item.id} ${n} != list ${list}`);
      }
    }
  }

  for (const cat of withPhaseServiceCatalog(SERVICE_CATEGORIES)) {
    for (const item of cat.items) {
      const list = getPublicListPriceEur(item.id);
      if (list <= 0) continue;
      const n = item.priceOnce ?? item.priceMonthly;
      if (n != null && n !== list) {
        errors.push(`marketing-catalog ${item.id} ${n} != list ${list}`);
      }
    }
  }

  return errors;
}

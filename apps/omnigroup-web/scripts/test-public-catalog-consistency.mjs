/**
 * Fails if public Pricing / Packages / Services can show different list prices
 * or mixed sale status. Run: node scripts/test-public-catalog-consistency.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function readRepo(rel) {
  return readFileSync(join(repo, rel), 'utf8');
}

const pricing = read('src/app/(marketing)/pricing/page.tsx');
const products = read('src/app/(marketing)/products/page.tsx');
const services = read('src/app/(marketing)/services/page.tsx');
const offers = read('src/lib/client-offers.ts');
const siteCompany = read('src/lib/site-company.ts');
const footer = read('src/components/Footer.tsx');
const verticalLanding = read('src/components/marketing/VerticalLanding.tsx');
const offerCard = read('src/components/marketing/OfferCard.tsx');
const catalogUi = read('src/lib/deliverable-catalog-ui.ts');
const marketingCatalog = read('src/lib/marketing-catalog.ts');
const contactForm = read('src/app/(marketing)/contact/ContactForm.tsx');
const contactRoute = read('src/app/api/contact/route.ts');
const marketingPlans = read('src/lib/marketing-plans.ts');
const quotePanel = read('src/components/platform/DeliverableQuotePanel.tsx');
const home = read('src/app/(marketing)/HomePageClient.tsx');
const publicCatalog = read('src/lib/public-catalog.ts');
const parity = read('src/lib/public-catalog-parity.ts');
const saleStatus = read('src/lib/sale-status.ts');
const availability = read('src/lib/package-delivery-spec.ts');
const catalog = read('src/lib/deliverable-catalog.ts');
const saasPlans = read('src/lib/saas-plans.ts');
const saasPricing = read('src/components/marketing/SaaSPlanPricing.tsx');
const payments = readRepo('atina-platform/atina/src/modules/payments/service/payments.service.ts');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(!pricing.includes('priceOverrideEur'), 'Pricing page must not override catalog prices');
assert(!products.includes('priceOverrideEur'), 'Packages page must not override catalog prices');
assert(!services.includes('priceOverrideEur'), 'Services page must not override catalog prices');
assert(!pricing.includes('calculateDeliverableQuote'), 'Pricing must use list prices, not quote calculator');
assert(!products.includes('calculateDeliverableQuote'), 'Packages must use list prices, not quote calculator');
assert(offers.includes('getPublicListPriceEur'), 'client-offers must export getPublicListPriceEur');
assert(offers.includes('getPublicCatalogStats'), 'client-offers must export getPublicCatalogStats');
assert(offers.includes('saleStatus: OfferSaleStatus'), 'ClientOffer must carry saleStatus');
assert(offers.includes('export function publicOfferWhen'), 'Timeline must be derived from saleStatus');
assert(
  !/when:\s*'When this package opens/.test(offers),
  'Offer copy must not use When this package opens as a delivery timeline',
);
assert(
  !/when:\s*'Monthly · when package is open'/.test(offers),
  'Offer copy must not use when package is open as a delivery timeline',
);
assert(!offers.includes('Opens as the factory grows'), 'Ready packages must not say the factory still has to grow');
assert(offerCard.includes('publicOfferWhen'), 'OfferCard must rewrite timeline from saleStatus');
assert(
  offers.includes('return getPackageAnchorEur(deliverableId)'),
  'Public list price must be the package anchor',
);
assert(verticalLanding.includes('getPublicListPriceEur'), 'Industry landings must use public list prices');
assert(verticalLanding.includes('saleStatus'), 'Industry landings must use the shared sale-status enum');
assert(!offerCard.includes('priceOverrideEur'), 'OfferCard must not accept a price override');
assert(catalogUi.includes('getPublicListPriceEur'), 'Catalog UI builder must use public list prices');
assert(!catalogUi.includes('calculateDeliverableQuote'), 'Catalog UI must not use the quote calculator');
assert(marketingCatalog.includes('getPublicListPriceEur'), 'Marketing catalog overlay must use public list prices');
assert(
  marketingCatalog.includes('export const SERVICE_CATEGORIES = withPhaseServiceCatalog'),
  'SERVICE_CATEGORIES must be exported already overlaid with list prices',
);
assert(
  marketingCatalog.includes('export const PRODUCT_CATEGORIES = withCatalogPricing'),
  'PRODUCT_CATEGORIES must overlay labels from the SaaS price book',
);
assert(!/from €99/.test(marketingCatalog), 'Marketing product catalog must not keep leftover €99 labels');
assert(quotePanel.includes('getPublicListPriceEur(deliverableId)'), 'Dashboard checkout must show the public list price');
assert(home.includes('getSaaSPlanPrice'), 'Homepage SaaS teaser must read the SaaS price book');
assert(home.includes('getPublicCatalogStats'), 'Homepage expert-service count must read the catalog');
assert(publicCatalog.includes('getPublicListPriceEur'), 'public-catalog.ts is the commerce barrel');
assert(parity.includes('findPublicCatalogMismatches'), 'Parity helper must exist for catalog diffs');
assert(parity.includes('billing'), 'Parity must fail when billing period drifts');
assert(parity.includes('READY_TO_BUY missing checkout route'), 'Parity must require a valid checkout route');
assert(parity.includes('quote-engine'), 'Parity must reject quote-engine prices on public offers');
assert(parity.includes('calculateDeliverableQuote'), 'Parity must compare list vs quote engine');
assert(publicCatalog.includes('listPublicProducts'), 'public-catalog must export listPublicProducts');
assert(pricing.includes('listClientOffers'), 'Pricing must list the shared catalog');
assert(products.includes('listClientOffers'), 'Packages must list the shared catalog');
assert(services.includes('listClientOffers'), 'Services must list the shared catalog');
assert(!siteCompany.includes('CONTACT_EMAIL_TO'), 'Public company email must not read CONTACT_EMAIL_TO');
assert(siteCompany.includes('hello@omnigrouptech.com'), 'Public company email must default to domain inbox');
assert(siteCompany.includes('Never render personal inboxes'), 'Public identity must block personal inboxes');
assert(footer.includes('publicSupportEmail'), 'Footer must sanitize personal inboxes');
assert(footer.includes('getSaaSPlanPrice'), 'Footer SaaS teaser must read the SaaS price book');
assert(saasPricing.includes('getSaaSPlanPrice'), 'SaaS comparison must read Omni Launch from the price book');
assert(marketingPlans.includes('getPublicListPriceEur'), 'Legacy add-ons must read public list prices');
assert(saleStatus.includes("READY_TO_BUY' | 'COMING_SOON' | 'REQUEST_QUOTE'"), 'One sale-status enum');
assert(availability.includes('saleStatus: OfferSaleStatus'), 'PackageAvailability must carry saleStatus');
assert(availability.includes('quoteOnly'), 'Availability must support REQUEST_QUOTE packages');
assert(offerCard.includes("saleStatus === 'READY_TO_BUY'"), 'Buy now only when READY_TO_BUY');
assert(offerCard.includes("saleStatus === 'REQUEST_QUOTE'"), 'Quote CTA only when REQUEST_QUOTE');
assert(offerCard.includes('Buy now'), 'Ready packages keep a Buy now CTA');
assert(!/ready \?[\s\S]*Buy now[\s\S]*:[\s\S]*Buy now/.test(offerCard), 'COMING_SOON must not render Buy now');
assert(payments.includes('getPackageAnchorEur'), 'Atina checkout must import the shared list-price function');
assert(payments.includes('const amount = listPriceEur'), 'Atina deliverable checkout must charge the list price');
assert(
  !/createDeliverable(?:Manual|Stripe)Checkout[\s\S]{0,1800}calculateDeliverableQuote/.test(payments),
  'Atina deliverable checkout must not call the quote calculator',
);
assert(!payments.includes('quotedSubtotalEur'), 'Checkout metadata must not store a second quote price');

const publicPages = [pricing, products, services, footer, read('src/app/(marketing)/layout.tsx')];
for (const src of publicPages) {
  assert(!/markokosic020@gmail\.com/.test(src), 'Personal Gmail must not appear in public UI source');
}

for (const [name, src] of [
  ['Pricing', pricing],
  ['Packages', products],
  ['Services', services],
]) {
  assert(!/€\d/.test(src), `${name} page must not hardcode euro prices`);
}

const rawItems = [...catalog.matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?anchorEur:\s*(\d+)/g)].map(
  (m) => ({ id: m[1], name: m[2], anchor: Number(m[3]) }),
);
assert(rawItems.length >= 17, `Expected the raw deliverable catalog, found ${rawItems.length}`);

const specIds = new Set(
  [...availability.matchAll(/deliverableId:\s*'([^']+)'/g)].map((m) => m[1]),
);
for (const item of rawItems) {
  assert(specIds.has(item.id), `${item.id} is in the catalog but missing from package-delivery-spec`);
}

const offerNames = new Set(
  [...offers.matchAll(/^\s+'([a-z0-9-]+)':\s*\{/gm)].map((m) => m[1]),
);
for (const item of rawItems) {
  assert(
    offerNames.has(item.id) || offers.includes('fallbackCopy'),
    `${item.id} has no client-offer copy and no fallback`,
  );
}

assert(saasPlans.includes('monthly: { EUR: 79, USD: 89 }'), 'SaaS Launch list price must stay 79/89 unless explicitly changed');
assert(existsSync(join(root, 'src/lib/sale-status.ts')), 'sale-status.ts must exist');
assert(contactForm.includes('CONTACT_BUDGETS'), 'Contact form must collect budget from the shared intake enum');
assert(contactForm.includes('CONTACT_TIMELINES'), 'Contact form must collect timeline from the shared intake enum');
assert(contactForm.includes('name="consent"'), 'Contact form must require consent');
assert(contactRoute.includes('consent_required'), 'Contact API must reject missing consent');
assert(contactRoute.includes('parseContactBudget'), 'Contact API must validate budget against the shared enum');

console.log('test-public-catalog-consistency: ok');

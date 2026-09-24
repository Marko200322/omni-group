/**
 * Walks every public product surface and fails on catalog drift.
 * Run: node scripts/test-public-catalog-surfaces.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const catalog = read('src/lib/deliverable-catalog.ts');
const offers = read('src/lib/client-offers.ts');
const publicCatalog = read('src/lib/public-catalog.ts');
const saleStatus = read('src/lib/sale-status.ts');
const availability = read('src/lib/package-delivery-spec.ts');
const offerCard = read('src/components/marketing/OfferCard.tsx');
const quotePanel = read('src/components/platform/DeliverableQuotePanel.tsx');
const orderPage = read('src/app/dashboard/order/page.tsx');
const launchBundles = read('src/lib/launch-bundles.ts');
const catalogBundleIds = read('src/lib/catalog-bundle-ids.ts');
const launchPanel = read('src/components/marketing/LaunchBundlesPanel.tsx');
const marketingCatalog = read('src/lib/marketing-catalog.ts');
const verticalLanding = read('src/components/marketing/VerticalLanding.tsx');
const payments = readFileSync(
  join(repo, 'atina-platform/atina/src/modules/payments/service/payments.service.ts'),
  'utf8',
);

const pages = {
  pricing: read('src/app/(marketing)/pricing/page.tsx'),
  products: read('src/app/(marketing)/products/page.tsx'),
  services: read('src/app/(marketing)/services/page.tsx'),
};

const ids = [...catalog.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
const uniqueIds = [...new Set(ids)];
assert(uniqueIds.length === 20, `Expected 20 catalog products, found ${uniqueIds.length}`);

const bundleIds = uniqueIds.filter((id) => id.startsWith('bundle-'));
assert(bundleIds.length === 3, `Expected 3 catalog bundles, found ${bundleIds.join(',')}`);

assert(publicCatalog.includes('listPublicProducts'), 'public-catalog must export listPublicProducts');
assert(offers.includes('return getPackageAnchorEur(deliverableId)'), 'List price must be the package anchor');
assert(offers.includes("saleStatus === 'READY_TO_BUY'"), 'Checkout href only when READY_TO_BUY');
assert(saleStatus.includes("READY_TO_BUY' | 'COMING_SOON' | 'REQUEST_QUOTE'"), 'One availability enum');
assert(availability.includes('saleStatus: OfferSaleStatus'), 'Availability carries saleStatus');

for (const [name, src] of Object.entries(pages)) {
  assert(src.includes('@/lib/public-catalog'), `${name} must import the public catalog barrel`);
  assert(src.includes('listClientOffers'), `${name} must list the shared catalog`);
  assert(src.includes('excludeBundles: true'), `${name} must not double-render bundle SKUs in the offer grid`);
  assert(src.includes('LaunchBundlesPanel'), `${name} must show bundles once in the shared panel`);
  assert(!src.includes('priceOverrideEur'), `${name} must not override prices`);
  assert(!src.includes('calculateDeliverableQuote'), `${name} must not use the quote calculator`);
  assert(!/€\d/.test(src), `${name} must not hardcode euro prices`);
}

assert(offerCard.includes("saleStatus === 'READY_TO_BUY'"), 'Buy now only when READY_TO_BUY');
assert(offerCard.includes("saleStatus === 'REQUEST_QUOTE'"), 'Quote CTA only when REQUEST_QUOTE');
assert(offerCard.includes('Buy now'), 'Ready CTA label is Buy now');
assert(!offerCard.includes('When this package opens'), 'OfferCard must not hardcode opens-later copy');
assert(quotePanel.includes('getPublicListPriceEur(deliverableId)'), 'Dashboard checkout shows list price');
assert(!quotePanel.includes('calculateDeliverableQuote'), 'Dashboard checkout must not use the quote engine');
assert(!quotePanel.includes('marketIntensity'), 'Dashboard checkout must not send marketIntensity');
assert(orderPage.includes('section="quote"'), 'Dashboard order is the checkout surface');
assert(verticalLanding.includes('getPublicListPriceEur'), 'Industry landings use list prices');
assert(verticalLanding.includes('saleStatus'), 'Industry landings use the shared status enum');

assert(launchBundles.includes('getPublicListPriceEur'), 'Launch bundles read the shared list price');
assert(launchBundles.includes('CATALOG_BUNDLE_IDS'), 'Launch bundles use the shared bundle ID list');
assert(catalogBundleIds.includes('bundle-portal-presence'), 'Launch bundles are catalog SKUs');
assert(!/bundleEur:\s*\d+/.test(launchBundles), 'Launch bundles must not hardcode a second price book');
assert(launchPanel.includes('bundle.offer.saleStatus'), 'Bundle CTAs follow saleStatus');

assert(
  !/priceOnce:\s*\d+|priceMonthly:\s*149|priceLabel: '€/.test(marketingCatalog),
  'SERVICE_CATEGORIES must not keep stale hardcoded catalog prices',
);

assert(payments.includes('const amount = listPriceEur'), 'Atina checkout charges the list price');
const stripeBff = read('src/app/api/atina/payments/stripe/deliverable-checkout/route.ts');
const manualBff = read('src/app/api/atina/payments/manual/deliverable-checkout/route.ts');
assert(!stripeBff.includes('marketIntensity'), 'Stripe BFF must not forward quote intensity');
assert(!manualBff.includes('marketIntensity'), 'Manual BFF must not forward quote intensity');
assert(!stripeBff.includes('amount'), 'Stripe BFF must not accept a client amount');
assert(
  !/createDeliverable(?:Manual|Stripe)Checkout[\s\S]{0,1800}const amount = quote\.clientPriceEur/.test(payments),
  'Atina checkout must not charge the quote calculator',
);

const names = [...catalog.matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g)];
const nameById = new Map(names.map((m) => [m[1], m[2]]));
const billingById = new Map(
  [...catalog.matchAll(/id:\s*'([^']+)'[\s\S]*?billing:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);
const specIds = [...availability.matchAll(/deliverableId:\s*'([^']+)'/g)].map((m) => m[1]);
const nav = read('src/lib/checkout-navigation.ts');
const parity = read('src/lib/public-catalog-parity.ts');

for (const id of uniqueIds) {
  assert(nameById.has(id), `${id} missing name in catalog`);
  assert(billingById.has(id), `${id} missing billing in catalog`);
  assert(specIds.includes(id), `${id} missing from package-delivery-spec`);
}

assert(nav.includes('buildDashboardQuoteHref'), 'Checkout route builder must exist');
assert(nav.includes('/dashboard/order'), 'READY checkout must land on dashboard order');
assert(nav.includes('/login?next='), 'Anonymous Buy now must go through login');
assert(parity.includes('READY_TO_BUY missing checkout route'), 'Parity must require a checkout route');
assert(parity.includes('COMING_SOON still points at checkout'), 'Parity must block COMING_SOON checkout');
assert(parity.includes('REQUEST_QUOTE still points at self-serve checkout'), 'Parity must send quotes to contact');
assert(parity.includes('billing'), 'Parity must compare billing period');

const dashboard = read('src/app/dashboard/order/page.tsx');
assert(dashboard.includes('section="quote"'), 'Dashboard order is the checkout surface');

console.log(`test-public-catalog-surfaces: ok (${uniqueIds.length} products, ${bundleIds.length} bundles)`);

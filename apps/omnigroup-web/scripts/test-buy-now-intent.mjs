/**
 * Buy Now / Start CTAs must keep product, plan, cycle, and currency through login.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const nav = read('src/lib/checkout-navigation.ts');
const offers = read('src/lib/client-offers.ts');
const saas = read('src/components/marketing/SaaSPlanPricing.tsx');
const register = read('src/app/register/page.tsx');
const billing = read('src/components/platform/BillingCheckoutPanel.tsx');
const quote = read('src/components/platform/DeliverableQuotePanel.tsx');
const landing = read('src/components/marketing/VerticalLanding.tsx');
const catalog = read('src/lib/deliverable-catalog.ts');

assert(nav.includes('service: string'), 'Quote checkout must carry service');
assert(nav.includes("q.set('category'"), 'Quote checkout must keep industry category');
assert(nav.includes("q.set('vertical'"), 'Quote checkout must keep vertical slug');
assert(nav.includes('/login?next='), 'Buy Now must preserve intent through login');
assert(offers.includes('buildLoginNextForQuote({ service: id'), 'Every ready offer Buy Now must include product ID');
assert(
  saas.includes('`/register?plan=${plan.slug}&cycle=${cycle}&currency=${currency}`'),
  'SaaS Start CTA must pass plan, cycle, and currency',
);
assert(register.includes('cycle') && register.includes('currency'), 'Register must forward cycle and currency');
assert(billing.includes("searchParams.get('cycle') === 'yearly'"), 'Billing must read yearly from the query');
assert(billing.includes('getSaaSPlanPrice(slug, billingCycle, currency)'), 'Billing must re-price from the SaaS book');
assert(quote.includes('getPublicListPriceEur(deliverableId)'), 'Order page must display the canonical list price');
assert(landing.includes('cycle=monthly'), 'Industry SaaS cards must not drop billing cycle');

const ids = [...catalog.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
assert(ids.length >= 20, `Expected 20 products, found ${ids.length}`);

console.log('test-buy-now-intent: ok');

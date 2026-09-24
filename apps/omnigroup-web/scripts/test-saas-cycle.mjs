/**
 * Yearly SaaS prices must be 10x monthly and the toggle must reach checkout.
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

const plans = read('src/lib/saas-plans.ts');
const pricing = read('src/components/marketing/SaaSPlanPricing.tsx');
const billing = read('src/components/platform/BillingCheckoutPanel.tsx');
const register = read('src/app/register/page.tsx');

const monthly = [...plans.matchAll(/monthly:\s*\{\s*EUR:\s*(\d+),\s*USD:\s*(\d+)\s*\}/g)];
const yearly = [...plans.matchAll(/yearly:\s*\{\s*EUR:\s*(\d+),\s*USD:\s*(\d+)\s*\}/g)];
assert(monthly.length === 3 && yearly.length === 3, 'Expected 3 SaaS plans with monthly and yearly books');
monthly.forEach((row, i) => {
  const eur = Number(row[1]);
  const usd = Number(row[2]);
  assert(Number(yearly[i][1]) === eur * 10, `Yearly EUR must be 10x monthly for plan ${i}`);
  assert(Number(yearly[i][2]) === usd * 10, `Yearly USD must be 10x monthly for plan ${i}`);
});

assert(pricing.includes("setCycle(value)"), 'Pricing UI must switch billing cycle');
assert(pricing.includes('Yearly · 2 months free'), 'Yearly toggle label must stay honest');
assert(pricing.includes('billed yearly'), 'Yearly cards must show the billed-yearly amount');
assert(
  pricing.includes('`/register?plan=${plan.slug}&cycle=${cycle}&currency=${currency}`'),
  'SaaS CTA must pass plan, cycle, and currency',
);
assert(register.includes('cycle') && register.includes('currency'), 'Register must forward cycle and currency');
assert(billing.includes("searchParams.get('cycle') === 'yearly'"), 'Checkout must read yearly from the query');
assert(billing.includes('getSaaSPlanPrice(slug, billingCycle, currency)'), 'Checkout must price from the SaaS book');
assert(billing.includes("setBillingCycle"), 'Checkout must let the buyer change cycle');

console.log('test-saas-cycle: ok');

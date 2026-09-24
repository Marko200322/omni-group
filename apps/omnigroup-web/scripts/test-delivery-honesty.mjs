/**
 * Fails if public marketing can promise automated delivery the factory cannot ship.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const honesty = readFileSync(join(root, 'src/lib/delivery-honesty.ts'), 'utf8');
const catalog = readFileSync(join(root, 'src/lib/deliverable-catalog.ts'), 'utf8');
const offers = readFileSync(join(root, 'src/lib/client-offers.ts'), 'utf8');
const offerCard = readFileSync(join(root, 'src/components/marketing/OfferCard.tsx'), 'utf8');
const pricing = readFileSync(join(root, 'src/app/(marketing)/pricing/page.tsx'), 'utf8');
const terms = readFileSync(join(root, 'src/app/(marketing)/legal/terms/page.tsx'), 'utf8');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const ids = [...catalog.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
assert(ids.length >= 20, `Expected 20 catalog IDs, found ${ids.length}`);
for (const id of ids) {
  assert(honesty.includes(`deliverableId: '${id}'`), `${id} missing from delivery-honesty`);
}

assert(honesty.includes("AUTOMATED' | 'SEMI_AUTOMATED' | 'HUMAN_DELIVERY"), 'Automation enum must be complete');
assert(catalog.includes("name: 'E-commerce demo storefront'"), 'Public ecommerce name must say demo storefront');
assert(!catalog.includes("name: 'E-commerce website'"), 'Public catalog must not sell a full e-commerce website name');
assert(offers.includes('automationLevel'), 'ClientOffer must carry automationLevel');
assert(offerCard.includes('Partly automated'), 'OfferCard must show the honesty badge');
assert(
  !pricing.includes('Automated delivery after payment confirmation.'),
  'Pricing must not claim every package is automated',
);
assert(pricing.includes('what still needs a person'), 'Pricing must point buyers at per-package delivery honesty');
assert(terms.includes('the pricing card'), 'Terms must defer delivery honesty to the package card');
assert(honesty.includes("'setup-custom'"), 'Custom deploy must be classified');
assert(honesty.includes("'lead-gen-retainer'"), 'Lead gen must be classified');
assert(honesty.includes("'support-dedicated'"), 'Dedicated support must be classified');
assert(honesty.includes("automationLevel: 'HUMAN_DELIVERY'"), 'Human delivery packages must exist');
assert(honesty.includes('prePurchaseWarning'), 'Dependencies and SLA targets must warn before Buy now');
assert(honesty.includes('HeyGen/D-ID'), 'AI support must disclose the video-key fallback');
assert(honesty.includes('outbound stack'), 'Lead gen must disclose the outbound-stack dependency');
assert(honesty.includes('not an automated SLA clock'), 'Support retainers must not claim an SLA engine');
assert(offerCard.includes('prePurchaseWarning'), 'OfferCard must render the pre-purchase warning');
assert(!offers.includes('support queue with 24h SLA'), 'Priority support copy must not claim an SLA clock');

console.log('test-delivery-honesty: ok');

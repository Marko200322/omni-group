/**
 * Legal pages must share company identity and must not invent registration details.
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

const pages = {
  terms: read('src/app/(marketing)/legal/terms/page.tsx'),
  privacy: read('src/app/(marketing)/legal/privacy/page.tsx'),
  cookies: read('src/app/(marketing)/legal/cookies/page.tsx'),
  refund: read('src/app/(marketing)/legal/refund/page.tsx'),
  impressum: read('src/app/(marketing)/legal/impressum/page.tsx'),
};
const company = read('src/lib/site-company.ts');
const processors = read('src/lib/data-processors.ts');

assert(company.includes('hello@omnigrouptech.com'), 'Public company email must stay the domain inbox');
assert(company.includes('TRANSACTIONAL_LOCAL'), 'Public contact must reject noreply / transactional From');
assert(!company.includes('support@omnigrouptech.com'), 'Do not invent a public support@ inbox');
assert(!company.includes('billing@omnigrouptech.com'), 'Do not invent a public billing@ inbox');
assert(company.includes('NEXT_PUBLIC_COMPANY_LEGAL_NAME'), 'Legal name must come from env, not invented copy');

for (const [name, src] of Object.entries(pages)) {
  assert(src.includes('getSiteCompany'), `${name} must use getSiteCompany`);
  assert(!/PIB\s+\d{5,}/.test(src), `${name} must not invent a tax ID`);
  assert(!/Acme|Example LLC|TODO company/i.test(src), `${name} must not use placeholder company names`);
}

assert(pages.terms.includes('after formal incorporation'), 'Terms must stay transparent if the firm is not registered');
assert(pages.impressum.includes('hasLegal'), 'Impressum must branch on real registration fields');
assert(pages.impressum.includes('Stripe'), 'Impressum payment must name Stripe as the default checkout');
assert(
  pages.impressum.includes('enabled for the signed-in account'),
  'Impressum must not imply bank transfer is always on',
);
assert(pages.impressum.includes('webhook'), 'Impressum must say the Stripe webhook is the source of truth');
assert(!pages.impressum.includes('IBAN RS') && !/IBAN\s+[A-Z]{2}\d{2}/.test(pages.impressum), 'Impressum must not invent an IBAN');
assert(pages.privacy.includes('DATA_PROCESSORS'), 'Privacy must render the data-processor inventory');
assert(pages.privacy.includes('DATA_CATEGORIES'), 'Privacy must list actual data categories');
assert(processors.includes("id: 'stripe'"), 'Inventory must include Stripe');
assert(processors.includes("id: 'resend'"), 'Inventory must include Resend');
assert(processors.includes("id: 'openrouter'"), 'Inventory must include the AI provider');
assert(pages.cookies.includes('og_session'), 'Cookies must name the session cookie');
assert(pages.cookies.includes('Accept analytics'), 'Cookies must require analytics consent before pixels');
assert(read('src/components/marketing/MarketingPixels.tsx').includes('hasAnalyticsConsent'), 'Pixels must wait for analytics consent');
assert(read('src/components/marketing/CookieBanner.tsx').includes('writeCookieConsent'), 'Banner must persist cookie preference');
assert(pages.refund.includes('14 days'), 'Refund window must stay documented');
assert(pages.refund.includes('supportEmail'), 'Refund contact must use the shared company email');
assert(pages.refund.includes('Stripe'), 'Refund must name Stripe as the card processor');
assert(pages.refund.includes('enabled for the signed-in account'), 'Refund must not imply bank transfer is always on');
assert(pages.terms.includes('webhook'), 'Terms must say the Stripe webhook is the source of truth');

console.log('test-legal-consistency: ok');

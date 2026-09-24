const base = (process.argv[2] || 'https://omnigrouptech.com').replace(/\/$/, '');

async function page(p) {
  const r = await fetch(base + p, { headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(p + ' ' + r.status);
  return r.text();
}

const ids = [
  'setup-quick',
  'setup-full',
  'setup-custom',
  'audit',
  'integration',
  'workflow-design',
  'support-priority',
  'support-dedicated',
  'landing',
  'website-business',
  'website-ecommerce',
  'white-label-setup',
  'sales-enablement',
  'vertical-package',
  'lead-gen-retainer',
  'ai-support-retainer',
  'custom-software',
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
];

function card(html, id) {
  const i = html.indexOf(`id="offer-${id}"`);
  if (i < 0) return null;
  return html.slice(i, i + 4500);
}

const errors = [];
const pages = {
  pricing: await page('/pricing'),
  products: await page('/products'),
  services: await page('/services'),
};

for (const [name, html] of Object.entries(pages)) {
  if (/When this package opens for checkout/i.test(html)) {
    errors.push(`${name} still has opens-later copy`);
  }
  if (/markokosic020@gmail\.com/i.test(html)) {
    errors.push(`${name} leaks Gmail`);
  }
  for (const stale of ['€279', '€1,599', '€1599', '€2,790', '€2790']) {
    if (html.includes(stale)) errors.push(`${name} stale price ${stale}`);
  }
  for (const id of ids) {
    const s = card(html, id);
    if (!s) {
      errors.push(`${name} missing ${id}`);
      continue;
    }
    const rawHref = (s.match(/href="([^"]+)"/) || [])[1] || '';
    const href = decodeURIComponent(rawHref);
    const buy = /Buy now/i.test(s);
    const quote = /Request a quote/i.test(s);
    const notify = /Notify me when ready/i.test(s);
    if (buy) {
      if (!href.includes('/login?next=') || !href.includes('/dashboard/order')) {
        errors.push(`${name} ${id} Buy now href invalid: ${rawHref}`);
      }
      if (!href.includes(`service=${id}`)) errors.push(`${name} ${id} checkout missing service id`);
    }
    if (notify && href.includes('/dashboard/order')) {
      errors.push(`${name} ${id} COMING_SOON points at checkout`);
    }
    if (quote && href.includes('/dashboard/order')) {
      errors.push(`${name} ${id} REQUEST_QUOTE points at checkout`);
    }
    if (!buy && !quote && !notify) errors.push(`${name} ${id} missing CTA`);
  }
}

const panelStart = pages.pricing.indexOf('Catalog bundles');
const panel = panelStart >= 0 ? pages.pricing.slice(panelStart, panelStart + 5000) : '';
for (const [label, price] of [
  ['Portal + presence bundle', '€1,090'],
  ['Sales launch bundle', '€1,590'],
  ['Ops clarity bundle', '€1,190'],
]) {
  if (!panel.includes(label)) errors.push(`bundle panel missing ${label}`);
  if (!panel.includes(price)) errors.push(`bundle panel missing ${price} for ${label}`);
}
if (/€279\b|€1,599|€2,790/.test(panel)) errors.push('bundle panel still has promo price book');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`audit-public-catalog-ctas: ok (${ids.length} products x 3 surfaces)`);

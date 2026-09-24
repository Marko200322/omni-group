/**
 * Fetches public product surfaces and reports price/name/status mismatches.
 * Usage: node scripts/audit-public-catalog-live.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://omnigrouptech.com').replace(/\/$/, '');

const EXPECTED = [
  ['setup-quick', 'Quick setup', 549, 'one_time'],
  ['setup-full', 'Full onboarding', 1690, 'one_time'],
  ['setup-custom', 'Custom deploy', 4900, 'one_time'],
  ['audit', 'Technical audit', 790, 'one_time'],
  ['integration', 'Custom integration', 1990, 'one_time'],
  ['workflow-design', 'Workflow design', 990, 'one_time'],
  ['support-priority', 'Priority support', 399, 'monthly'],
  ['support-dedicated', 'Dedicated support', 1190, 'monthly'],
  ['landing', 'Landing + copy', 1290, 'one_time'],
  ['website-business', 'Business website', 2990, 'one_time'],
  ['website-ecommerce', 'E-commerce website', 4900, 'one_time'],
  ['white-label-setup', 'White-label packaging', 2490, 'one_time'],
  ['sales-enablement', 'Sales enablement', 1190, 'one_time'],
  ['vertical-package', 'Vertical solution', 790, 'monthly'],
  ['lead-gen-retainer', 'Lead gen retainer', 990, 'monthly'],
  ['ai-support-retainer', 'AI support retainer', 690, 'monthly'],
  ['custom-software', 'Software starter kit', 7900, 'one_time'],
  ['bundle-portal-presence', 'Portal + presence bundle', 1090, 'one_time'],
  ['bundle-sales-launch', 'Sales launch bundle', 1590, 'one_time'],
  ['bundle-ops-clarity', 'Ops clarity bundle', 1190, 'one_time'],
];

function parseEuro(html) {
  const m = html.match(/€\s*([\d.,]+)/);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ''));
}

function extractCard(html, id) {
  const marker = `id="offer-${id}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const slice = html.slice(start, start + 4500);
  const name = (slice.match(/<h3[^>]*>([^<]+)<\/h3>/i) || [])[1]?.trim() ?? null;
  const price = parseEuro(slice);
  const buyNow = /Buy now/i.test(slice);
  const quote = /Request a quote/i.test(slice);
  const coming = /Coming soon|Notify me when ready|Currently under construction/i.test(slice);
  const opensLater = /When this package opens for checkout/i.test(slice);
  let status = 'UNKNOWN';
  if (buyNow && !coming) status = 'READY_TO_BUY';
  else if (quote) status = 'REQUEST_QUOTE';
  else if (coming) status = 'COMING_SOON';
  return { name, price, buyNow, quote, coming, opensLater, status };
}

function extractBundlePanel(html, title, expectedPrice) {
  const start = html.indexOf(title);
  if (start < 0) return null;
  const slice = html.slice(start, start + 1800);
  return {
    name: title,
    price: parseEuro(slice),
    buyNow: /Buy now/i.test(slice),
    expectedPrice,
  };
}

async function fetchPage(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'user-agent': 'omni-catalog-audit/1.0', 'cache-control': 'no-cache' },
  });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.text();
}

const pages = {
  pricing: await fetchPage('/pricing'),
  products: await fetchPage('/products'),
  services: await fetchPage('/services'),
};

const errors = [];
const rows = [];

for (const [id, name, price] of EXPECTED) {
  const cells = {};
  for (const [surface, html] of Object.entries(pages)) {
    const card = extractCard(html, id);
    cells[surface] = card;
    if (!card) {
      errors.push(`${id} missing on /${surface}`);
      continue;
    }
    if (card.name && card.name !== name) errors.push(`${id} /${surface} name "${card.name}" != "${name}"`);
    if (card.price !== price) errors.push(`${id} /${surface} price €${card.price} != €${price}`);
    if (card.opensLater) errors.push(`${id} /${surface} has "When this package opens for checkout"`);
  }
  const statuses = ['pricing', 'products', 'services']
    .map((s) => cells[s]?.status)
    .filter(Boolean);
  if (new Set(statuses).size > 1) {
    errors.push(`${id} status mismatch: ${JSON.stringify(cells)}`);
  }
  const status = statuses[0] ?? 'MISSING';
  const prices = ['pricing', 'products', 'services'].map((s) => cells[s]?.price ?? '—');
  const ok =
    prices.every((p) => p === price) &&
    statuses.every((s) => s === status) &&
    !['pricing', 'products', 'services'].some((s) => cells[s]?.opensLater);
  rows.push({
    id,
    name,
    pricing: prices[0],
    products: prices[1],
    services: prices[2],
    status,
    result: ok ? 'MATCH' : 'MISMATCH',
  });
}

for (const [id, name, price] of EXPECTED.filter((r) => r[0].startsWith('bundle-'))) {
  const panel = extractBundlePanel(pages.pricing, name, price);
  if (panel && panel.price !== price) {
    errors.push(`pricing bundle panel ${id} €${panel.price} != €${price}`);
  }
}

  const gmail = Object.entries(pages).filter(([, html]) => /markokosic020@gmail\.com/i.test(html));
if (gmail.length) errors.push(`Gmail leaked on ${gmail.map(([k]) => k).join(',')}`);

const quoteEngineLeaks = ['€1,074', '€1074', '€3,306', '€9,586', '€15,454'];
for (const [name, html] of Object.entries(pages)) {
  for (const stale of quoteEngineLeaks) {
    if (html.includes(stale)) errors.push(`${name} leaked M6 quote-engine price ${stale}`);
  }
}

console.log('PRODUCT | PRICING | PRODUCTS | SERVICES | CHECKOUT | STATUS | RESULT');
for (const r of rows) {
  const checkout = r.status === 'READY_TO_BUY' ? `€${r.pricing}` : r.status === 'REQUEST_QUOTE' ? 'quote' : '—';
  console.log(`${r.name} | €${r.pricing} | €${r.products} | €${r.services} | ${checkout} | ${r.status} | ${r.result}`);
}

if (errors.length) {
  console.error(`\naudit-public-catalog-live: ${errors.length} mismatch(es)`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log(`\naudit-public-catalog-live: ok (${rows.length} products, ${base})`);

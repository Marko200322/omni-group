#!/usr/bin/env node
/**
 * Cross-compare all base deliverables on /pricing, /products, /services.
 * Does NOT rewrite prices — reports mismatches only.
 *
 * Usage: node scripts/audit-public-23-crosspage.mjs [webBase] [apiBase]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, '..');
const repoRoot = join(webRoot, '..', '..');
const webBase = (process.argv[2] || 'https://omnigrouptech.com').replace(/\/$/, '');
const apiBase = (process.argv[3] || 'https://api.omnigrouptech.com').replace(/\/$/, '');

function loadCatalogIds() {
  const src = readFileSync(join(webRoot, 'src/lib/deliverable-catalog.ts'), 'utf8');
  const ids = [...src.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
  // unique preserve order
  return [...new Set(ids)];
}

function loadOfferMeta() {
  // Parse marketing names/prices from client-offers + deliverable-catalog anchors is fragile;
  // prefer live card extraction and compare surfaces to each other.
  return loadCatalogIds();
}

function parseEuro(html) {
  const m = html.match(/€\s*([\d.,]+)/);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ''));
}

function extractBilling(slice) {
  if (/\/\s*mo\b|per month|monthly/i.test(slice)) return 'monthly';
  if (/one[-\s]?time|one time/i.test(slice)) return 'one_time';
  return null;
}

function extractCard(html, id) {
  const marker = `id="offer-${id}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const slice = html.slice(start, start + 14000);
  const name = (slice.match(/<h3[^>]*>([^<]+)<\/h3>/i) || [])[1]?.trim() ?? null;
  const price = parseEuro(slice);
  const billing = extractBilling(slice);
  const buyNow = /Buy now/i.test(slice);
  const quote = /Request a quote/i.test(slice);
  const coming = /Coming soon|Notify me when ready|Currently under construction/i.test(slice);
  let status = 'UNKNOWN';
  if (buyNow && !coming) status = 'READY_TO_BUY';
  else if (quote) status = 'REQUEST_QUOTE';
  else if (coming) status = 'COMING_SOON';
  const fffd = (slice.match(/\uFFFD/g) || []).length;
  return { id, name, price, billing, status, fffd };
}

async function fetchPage(path) {
  const res = await fetch(`${webBase}${path}`, {
    headers: { 'user-agent': 'omni-23-crosspage/1.0', 'cache-control': 'no-cache' },
  });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.text();
}

const ids = loadOfferMeta();
const pages = {
  pricing: await fetchPage('/pricing'),
  products: await fetchPage('/products'),
  services: await fetchPage('/services'),
};

const errors = [];
const rows = [];
let fffdTotal = 0;

for (const id of ids) {
  const cells = {};
  for (const [surface, html] of Object.entries(pages)) {
    const card = extractCard(html, id);
    cells[surface] = card;
    if (!card) {
      // /products is client-filtered: cards render only after an industry is chosen.
      if (surface === 'products') continue;
      if (!id.startsWith('bundle-')) errors.push(`${id} missing on /${surface}`);
      continue;
    }
    fffdTotal += card.fffd;
    if (card.fffd) errors.push(`${id} /${surface} has U+FFFD x${card.fffd}`);
  }
  const present = ['pricing', 'products', 'services'].filter((s) => cells[s]);
  if (present.length >= 2) {
    const names = present.map((s) => cells[s].name).filter(Boolean);
    if (new Set(names).size > 1) errors.push(`${id} name mismatch: ${JSON.stringify(names)}`);
    const prices = present.map((s) => cells[s].price);
    if (new Set(prices.map(String)).size > 1) errors.push(`${id} price mismatch: ${JSON.stringify(prices)}`);
    const bills = present.map((s) => cells[s].billing).filter(Boolean);
    if (bills.length >= 2 && new Set(bills).size > 1) {
      errors.push(`${id} billing mismatch: ${JSON.stringify(bills)}`);
    }
    const statuses = present.map((s) => cells[s].status);
    if (new Set(statuses).size > 1) errors.push(`${id} status mismatch: ${JSON.stringify(statuses)}`);
  }
  rows.push({
    id,
    name: cells.pricing?.name ?? cells.products?.name ?? cells.services?.name ?? null,
    pricing: cells.pricing,
    products: cells.products,
    services: cells.services,
  });
}

// Industry matrix: each of 50 categories should return 23 package rows
const catSrc = readFileSync(join(webRoot, 'src/lib/category-pricing.ts'), 'utf8');
// INDUSTRY_CATEGORIES slugs use underscore or hyphen (admin_support, real-estate).
const industries = [...catSrc.matchAll(/slug:\s*'([a-z0-9_-]+)'/g)].map((m) => m[1]);
const uniqueIndustries = [...new Set(industries)];
const industryResults = [];
for (const slug of uniqueIndustries) {
  // Prefer web BFF (same path the pricing industry filter uses); fall back to Atina API.
  const urls = [
    `${webBase}/api/atina/billing/package-matrix?industryCategory=${encodeURIComponent(slug)}`,
    `${apiBase}/api/v1/billing/package-matrix?industryCategory=${encodeURIComponent(slug)}`,
  ];
  try {
    let http = 0;
    let json = {};
    for (const url of urls) {
      const res = await fetch(url, {
        headers: { 'user-agent': 'omni-23-crosspage/1.0', accept: 'application/json' },
      });
      http = res.status;
      json = await res.json().catch(() => ({}));
      if (res.ok && (json?.data?.packages || json?.packages)) break;
    }
    const pkgs = json?.data?.packages ?? json?.packages ?? [];
    const count = Array.isArray(pkgs) ? pkgs.length : 0;
    const pkgIds = Array.isArray(pkgs) ? pkgs.map((p) => p.deliverableId).filter(Boolean) : [];
    const missingIds = ids.filter((id) => !pkgIds.includes(id));
    const ok = http >= 200 && http < 300 && count >= ids.length && missingIds.length === 0;
    if (!ok) {
      errors.push(
        `industry ${slug}: http=${http} packages=${count} expected>=${ids.length} missing=${missingIds.slice(0, 5).join(',')}`,
      );
    }
    industryResults.push({ slug, http, count, missing: missingIds.length, ok });
  } catch (e) {
    errors.push(`industry ${slug}: ${e.message}`);
    industryResults.push({ slug, ok: false, error: e.message });
  }
}

const outDir = join(repoRoot, 'docs/evidence/_marko-1.2-public-fix-20261025');
mkdirSync(outDir, { recursive: true });
const summary = {
  webBase,
  apiBase,
  catalogIds: ids.length,
  industries: uniqueIndustries.length,
  fffdTotal,
  crossPageErrors: errors.filter((e) => !e.startsWith('industry ')).length,
  industryErrors: errors.filter((e) => e.startsWith('industry ')).length,
  industryOk: industryResults.filter((r) => r.ok).length,
  errors,
  rows: rows.map((r) => ({
    id: r.id,
    name: r.name,
    prices: {
      pricing: r.pricing?.price ?? null,
      products: r.products?.price ?? null,
      services: r.services?.price ?? null,
    },
    names: {
      pricing: r.pricing?.name ?? null,
      products: r.products?.name ?? null,
      services: r.services?.name ?? null,
    },
  })),
  industryResults,
};
writeFileSync(join(outDir, 'crosspage-23-and-industries.json'), JSON.stringify(summary, null, 2));

console.log(`catalogIds=${ids.length} industries=${uniqueIndustries.length} fffd=${fffdTotal}`);
console.log(
  `cross-page mismatches=${summary.crossPageErrors} industry ok=${summary.industryOk}/${uniqueIndustries.length}`,
);
if (errors.length) {
  console.error(`\naudit-public-23-crosspage: ${errors.length} issue(s)`);
  for (const e of errors.slice(0, 40)) console.error(' -', e);
  if (errors.length > 40) console.error(` ... +${errors.length - 40} more`);
  process.exit(1);
}
console.log(`\naudit-public-23-crosspage: ok (${webBase})`);

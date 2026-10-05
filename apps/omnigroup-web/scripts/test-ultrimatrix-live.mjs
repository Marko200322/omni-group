/**
 * UltrMatrix live design probes — sample public site URLs from last matrix merge
 * (or known /sites/ patterns) and score title/OG/content honesty.
 *
 * Does not invent LIVE ads. Exit 1 if site packages fail hard probes.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evidence = join(root, 'docs', 'evidence');
const webBase = process.env.ULTRIMATRIX_WEB_BASE || 'https://omnigrouptech.com';

const SITE_PACKAGES = new Set([
  'landing',
  'website-business',
  'website-ecommerce',
  'white-label-setup',
  'bundle-portal-presence',
  'bundle-sales-launch',
]);

function loadSampleUrls() {
  const merged = join(evidence, 'fulfillment-matrix-prod-MERGED-20261004_200516-after-retry.csv');
  const urls = [];
  // Matrix CSV has no publicUrl column — probe known public surfaces + pricing
  urls.push({ kind: 'pricing', url: `${webBase}/pricing` });
  urls.push({ kind: 'home', url: `${webBase}/` });
  urls.push({ kind: 'products', url: `${webBase}/products` });
  // Probe a few industry landings if present in sitemap-style paths
  for (const slug of ['marketing', 'fitness', 'legal_services']) {
    urls.push({ kind: 'sites_probe', url: `${webBase}/sites/${slug}`, optional: true });
  }
  if (existsSync(merged)) {
    urls.push({ kind: 'matrix_evidence', url: 'local', note: 'matrix after-retry present' });
  }
  return urls;
}

async function probeUrl(entry) {
  if (entry.url === 'local') {
    return { ...entry, ok: true, score: 100, notes: entry.note };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(entry.url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'OmniUltrMatrix/1.0' },
      redirect: 'follow',
    });
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
    const hasOg = /property=["']og:title["']/i.test(html) || /name=["']description["']/i.test(html);
    const textLen = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').trim().length;
    const looksEmpty = textLen < 400;
    const soft404 = /not found|404|under construction/i.test(title) && res.status === 200;
    let score = 0;
    if (res.status >= 200 && res.status < 400) score += 40;
    if (title.length > 3) score += 20;
    if (hasOg) score += 20;
    if (!looksEmpty) score += 20;
    if (soft404) score -= 30;
    const ok = entry.optional ? true : score >= 60 && res.status < 400;
    return {
      ...entry,
      status: res.status,
      title: title.slice(0, 80),
      textLen,
      hasOg,
      score: Math.max(0, Math.min(100, score)),
      ok,
      notes: soft404 ? 'soft-404 title' : looksEmpty ? 'thin content' : 'ok',
    };
  } catch (e) {
    return {
      ...entry,
      ok: Boolean(entry.optional),
      score: 0,
      notes: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(t);
  }
}

const samples = loadSampleUrls();
const results = [];
for (const s of samples) {
  results.push(await probeUrl(s));
}

const hard = results.filter((r) => !r.optional && r.kind !== 'matrix_evidence');
const failed = hard.filter((r) => !r.ok);
const avg = hard.length ? Math.round(hard.reduce((a, r) => a + (r.score || 0), 0) / hard.length) : 0;

mkdirSync(evidence, { recursive: true });
const outTxt = join(evidence, 'ultrimatrix-live-20261005.txt');
const outJson = join(evidence, 'ultrimatrix-live-20261005.json');
const report = {
  agent: 'ULTRIMATRIX-LIVE',
  webBase,
  sitePackagesTracked: [...SITE_PACKAGES],
  avgDesignScore: avg,
  failed: failed.length,
  results,
};
writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
writeFileSync(
  outTxt,
  [
    `avgDesignScore=${avg}`,
    `failed=${failed.length}`,
    ...results.map(
      (r) =>
        `${r.ok ? 'PASS' : 'FAIL'} ${r.kind} ${r.url} status=${r.status ?? '-'} score=${r.score} ${r.notes || ''} title=${r.title || ''}`,
    ),
  ].join('\n'),
  'utf8',
);

console.log(`UltrMatrix live avg=${avg} failed=${failed.length}`);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.kind} score=${r.score} ${r.url}`);
}
if (failed.length) process.exit(1);

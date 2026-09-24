/**
 * Scores all 907 industry landings: uniqueness, relevance, CTA, SEO.
 * Usage: node scripts/audit-industry-landings.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(readFileSync(join(root, 'src/lib/generated-verticals-index.json'), 'utf8'));
const frames = JSON.parse(readFileSync(join(root, 'src/lib/industry-pain-frames.json'), 'utf8'));
const categorySrc = readFileSync(join(root, 'src/lib/category-pricing.ts'), 'utf8');
const copySrc = readFileSync(join(root, 'src/lib/vertical-landing-copy.ts'), 'utf8');
const landingSrc = readFileSync(join(root, 'src/components/marketing/VerticalLanding.tsx'), 'utf8');
const pageSrc = readFileSync(join(root, 'src/app/(marketing)/solutions/[slug]/page.tsx'), 'utf8');

const BANNED = [
  'invoices and delivery status live in different tools',
  'new hires cannot see what the last project promised',
  'support questions repeat because nothing is documented',
  'leads sit in inboxes instead of a pipeline',
  'handoffs between sales and fulfillment get lost',
];

const FORBIDDEN = {
  healthcare: /\b(restaurant|harvest|courtroom|construction site|weigh ticket)\b/i,
  legal: /\b(patient intake|clinical notes|harvest|restaurant kitchen)\b/i,
  legal_services: /\b(patient intake|clinical notes|harvest|restaurant kitchen)\b/i,
  finance: /\b(construction site|harvest|patient intake|clinical)\b/i,
  finance_accounting: /\b(construction site|harvest|patient intake|clinical)\b/i,
  agriculture: /\b(patient|clinical|courtroom|restaurant)\b/i,
  hospitality: /\b(patient intake|clinical notes|courtroom)\b/i,
  construction: /\b(patient intake|clinical notes|policyholder)\b/i,
  admin_support: /\b(patient intake|clinical notes|harvest|courtroom)\b/i,
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function hashSlug(slug) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickDistinct(items, seed, count) {
  if (!items.length) return [];
  const out = [];
  const used = new Set();
  for (let i = 0; i < count; i += 1) {
    let idx = (seed + i * 7) % items.length;
    let guard = 0;
    while (used.has(idx) && guard < items.length) {
      idx = (idx + 1) % items.length;
      guard += 1;
    }
    used.add(idx);
    out.push(items[idx]);
  }
  return out;
}

function nicheWork(name) {
  return String(name).replace(/\s*\([^)]+\)\s*$/, '').trim();
}

function framesFor(category) {
  const raw = String(category || '').toLowerCase();
  return frames[raw] || frames[raw.replace(/-/g, '_')] || [];
}

function bind(frame, work) {
  return frame.replace(/\{work\}/g, work.toLowerCase());
}

function mentions(text, work) {
  const hay = text.toLowerCase();
  if (hay.includes(work.toLowerCase())) return true;
  const tokens = work
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  return tokens.length > 0 && tokens.every((t) => hay.includes(t));
}

assert(copySrc.includes("from './industry-copy'"), 'Landing copy must bind niche work nouns');
assert(copySrc.includes('nicheWorkNoun'), 'Landing copy must use the niche work noun');
assert(landingSrc.includes('cycle=monthly'), 'Industry SaaS CTAs must preserve billing cycle');
assert(landingSrc.includes('plan=${plan.slug}'), 'Industry SaaS CTAs must preserve plan ID');
assert(landingSrc.includes('buildLoginNextForQuote'), 'Recommended services must keep product intent');
assert(pageSrc.includes('buildVerticalLandingCopy'), 'SEO description must come from landing copy');
assert(pageSrc.includes('marketingOpenGraph'), 'Industry pages must set OG from landing copy');

const categoryNames = new Map(
  [...categorySrc.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);
const categorySlugs = [...categoryNames.keys()];
for (const slug of categorySlugs) {
  const key = slug.replace(/-/g, '_');
  assert(frames[slug]?.length || frames[key]?.length, `Missing niche frames for ${slug}`);
}

const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const verticals = (index.verticals || []).filter((row) => PUBLIC_SLUG.test(row.slug));
assert(verticals.length >= 900, `Expected ~907 verticals, found ${verticals.length}`);
assert(
  !(index.verticals || []).some((row) => !PUBLIC_SLUG.test(row.slug)),
  'Index must not contain spaced or invalid industry slugs',
);

const slugs = new Set();
const headlines = new Map();
const ledes = new Map();
const painSets = new Map();
const counts = { INVALID: 0, WEAK: 0, GENERIC: 0, GOOD: 0 };
const invalid = [];

for (const row of verticals) {
  if (slugs.has(row.slug)) {
    counts.INVALID += 1;
    invalid.push({ slug: row.slug, reason: 'duplicate_slug' });
    continue;
  }
  slugs.add(row.slug);

  const work = nicheWork(row.name);
  const categoryName = categoryNames.get(row.category) || row.category.replace(/_/g, ' ');
  const pool = framesFor(row.category);
  const seed = hashSlug(row.slug);
  const selected = pickDistinct(pool, seed, 4);
  const pains = selected.slice(0, 3).map(
    (frame) => `${categoryName.toLowerCase()} teams see that ${bind(frame, work)}`,
  );
  const pain = bind(selected[selected.length - 1] || '{work} work has no shared record', work);
  const name = row.name;
  const headlinePool = [
    `${name}: ${work} operations for ${categoryName} teams`,
    `Run ${work} in ${categoryName} without losing the last handoff`,
    `${name} — one ${categoryName} workspace`,
    `A quieter ${categoryName} system for ${work}`,
  ];
  const headline = `${headlinePool[seed % headlinePool.length]}`;
  const lede = `${work} teams usually stall when ${pain}. Omni Group gives ${categoryName} operators a workspace.`;
  const blob = [headline, lede, ...pains].join(' ');

  if (!pool.length) {
    counts.GENERIC += 1;
    invalid.push({ slug: row.slug, reason: 'generic_fallback' });
    continue;
  }
  if (BANNED.some((banned) => blob.toLowerCase().includes(banned))) {
    counts.INVALID += 1;
    invalid.push({ slug: row.slug, reason: 'banned_generic_pain', work });
    continue;
  }
  const forbidden = FORBIDDEN[row.category] || FORBIDDEN[String(row.category).replace(/-/g, '_')];
  if (forbidden?.test(blob)) {
    counts.INVALID += 1;
    invalid.push({ slug: row.slug, reason: 'cross_industry_wording', work });
    continue;
  }
  if (![headline, lede, ...pains].every((text) => mentions(text, work))) {
    counts.INVALID += 1;
    invalid.push({ slug: row.slug, reason: 'niche_not_mentioned', work });
    continue;
  }

  headlines.set(headline, (headlines.get(headline) || 0) + 1);
  ledes.set(lede, (ledes.get(lede) || 0) + 1);
  painSets.set(pains.join('|'), (painSets.get(pains.join('|')) || 0) + 1);
  counts.GOOD += 1;
}

const duplicateHeadlines = [...headlines.values()].filter((n) => n > 1).length;
const duplicateLedes = [...ledes.values()].filter((n) => n > 1).length;
const duplicatePainSets = [...painSets.values()].filter((n) => n > 1).length;

assert(counts.INVALID === 0, `Industry relevance INVALID=${counts.INVALID}: ${JSON.stringify(invalid.slice(0, 8))}`);
assert(counts.GENERIC === 0, `Industry pages still falling back to generic frames: ${counts.GENERIC}`);
assert(duplicateLedes === 0, `Duplicate industry descriptions: ${duplicateLedes}`);
assert(duplicatePainSets === 0, `Duplicate problem sets: ${duplicatePainSets}`);
assert(duplicateHeadlines === 0, `Duplicate titles: ${duplicateHeadlines}`);

console.log(
  'audit-industry-landings: ok',
  JSON.stringify({
    pages: verticals.length,
    uniqueSlugs: slugs.size,
    scores: counts,
    uniqueHeadlines: headlines.size,
    uniqueLedes: ledes.size,
    uniquePainSets: painSets.size,
  }),
);

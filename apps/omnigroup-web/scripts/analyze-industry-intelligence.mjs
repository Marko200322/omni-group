/**
 * Reads ALL generated verticals and scores relevance, mapping, and SEO uniqueness.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(readFileSync(join(root, 'src/lib/generated-verticals-index.json'), 'utf8'));
const frames = JSON.parse(readFileSync(join(root, 'src/lib/industry-pain-frames.json'), 'utf8'));
const categorySrc = readFileSync(join(root, 'src/lib/category-pricing.ts'), 'utf8');
const mapSrc = readFileSync(join(root, 'src/lib/industry-sku-map.ts'), 'utf8');
const fallbackSrc = readFileSync(join(root, 'src/lib/public-site-api.ts'), 'utf8');

const BANNED = [
  'invoices and delivery status live in different tools',
  'new hires cannot see what the last project promised',
  'support questions repeat because nothing is documented',
  'leads sit in inboxes instead of a pipeline',
  'handoffs between sales and fulfillment get lost',
];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

assert(
  !fallbackSrc.includes('DELIVERABLE_CATALOG.map((d) => ({'),
  'Fallback must not dump the full catalog onto industry pages',
);
assert(mapSrc.includes('recommendSkusForIndustry'), 'Industry SKU map must exist');

const categoryNames = new Map(
  [...categorySrc.matchAll(/slug:\s*'([^']+)',\s*name:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);

const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const verticals = (index.verticals || []).filter((row) => row.hasPage && PUBLIC_SLUG.test(row.slug));

function framesFor(category) {
  const raw = String(category || '').toLowerCase();
  return frames[raw] || frames[raw.replace(/-/g, '_')] || [];
}

function nicheWork(name) {
  return String(name || '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

const clusterOf = {
  healthcare: 'regulated_ops',
  government: 'regulated_ops',
  energy: 'regulated_ops',
  industrial: 'regulated_ops',
};

function cluster(category) {
  const key = String(category || '')
    .toLowerCase()
    .replace(/-/g, '_');
  return clusterOf[key] || 'other';
}

const counts = {
  inspected: 0,
  missingFrames: 0,
  genericBanned: 0,
  thinName: 0,
  nearDuplicatePain: 0,
  wrongLeadGenOnRegulated: 0,
};
const painFingerprints = new Map();
const byCategory = new Map();
const headlines = new Set();
const ledes = new Set();

for (const row of verticals) {
  counts.inspected += 1;
  const work = nicheWork(row.name);
  const pool = framesFor(row.category);
  if (!pool.length) counts.missingFrames += 1;
  if (!work || work.length < 3) counts.thinName += 1;
  const categoryName = categoryNames.get(row.category) || String(row.category || '').replace(/_/g, ' ');
  const blob = [row.name, row.valueProp, ...pool.map((f) => f.replace(/\{work\}/g, work.toLowerCase()))]
    .join(' ')
    .toLowerCase();
  if (BANNED.some((b) => blob.includes(b))) counts.genericBanned += 1;
  const fp = pool.join('|');
  const prev = painFingerprints.get(fp) || 0;
  painFingerprints.set(fp, prev + 1);
  if (cluster(row.category) === 'regulated_ops' && /lead-gen-retainer/.test(JSON.stringify(row))) {
    counts.wrongLeadGenOnRegulated += 1;
  }
  const cat = row.category || 'unknown';
  byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  headlines.add(`${work}::${categoryName}`);
  ledes.add(`${work}::${row.slug}`);
}

const sharedPainSets = [...painFingerprints.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);

const report = {
  inspected: counts.inspected,
  uniqueSlugs: new Set(verticals.map((v) => v.slug)).size,
  categories: byCategory.size,
  missingFrames: counts.missingFrames,
  genericBanned: counts.genericBanned,
  thinName: counts.thinName,
  pagesSharingCategoryPainSet: sharedPainSets,
  uniqueHeadlineKeys: headlines.size,
  uniqueLedeKeys: ledes.size,
  byCategory: Object.fromEntries([...byCategory.entries()].sort((a, b) => b[1] - a[1])),
};

const out = join(root, '../../docs/evidence/industry-intelligence-20260924.json');
try {
  writeFileSync(out, JSON.stringify(report, null, 2));
} catch {
  /* evidence folder may be read-only in some environments */
}

console.log('analyze-industry-intelligence:', JSON.stringify(report));
if (counts.missingFrames || counts.genericBanned) {
  throw new Error('Industry intelligence found invalid frames or banned generic pains');
}

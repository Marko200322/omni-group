/**
 * Capability mapping must stay relevant and never dump the full catalog.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const mapSrc = readFileSync(join(root, 'src/lib/industry-sku-map.ts'), 'utf8');
const fallback = readFileSync(join(root, 'src/lib/public-site-api.ts'), 'utf8');
const landing = readFileSync(join(root, 'src/components/marketing/VerticalLanding.tsx'), 'utf8');
const atinaProfiles = readFileSync(
  join(root, '../../atina-platform/atina/src/modules/autonomy-loop/lib/vertical-delivery-profiles.ts'),
  'utf8',
);

assert(fallback.includes('recommendSkusForIndustry'), 'Fallback landings must use the capability map');
assert(!fallback.includes('DELIVERABLE_CATALOG.map((d) => ({'), 'Fallback must not list every SKU');
assert(landing.includes('recommendSkusForIndustry'), 'Vertical landing must use the capability map');
assert(landing.includes('isCatalogDump'), 'Landing must replace catalog dumps');
assert(atinaProfiles.includes('legacyPrimaryDeliverables'), 'Legacy SMB profiles must pick SKUs by cluster');
assert(atinaProfiles.includes("if (regulated.has(slug)) return ['audit'"), 'Regulated industries must not default to lead-gen');
assert(mapSrc.includes("'website-ecommerce': ['regulated_ops'"), 'Ecommerce demo SKU is forbidden on regulated pages');

const catalog = JSON.parse(readFileSync(join(root, 'src/lib/generated-verticals-index.json'), 'utf8'));
const categories = new Set(
  (catalog.verticals || [])
    .filter((row) => row.hasPage && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))
    .map((row) => row.category),
);
assert(categories.size >= 40, `Expected many industry categories, found ${categories.size}`);

console.log('test-industry-sku-map: ok', { categories: categories.size });

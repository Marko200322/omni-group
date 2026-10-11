/**
 * Apply docs/evidence/GROK47-PRICE-TABLE-*.json → package-delivery-spec M6 + catalog anchorEur
 * (atina + web). Also bumps intro default discountPct when JSON says so.
 *
 * Usage: node scripts/apply-grok-price-table.mjs [path-to-json]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = join(root, 'docs', 'evidence');

function resolveJsonPath(arg) {
  if (arg) return arg;
  const files = readdirSync(evidence)
    .filter((f) => /^GROK47-PRICE-TABLE-.*\.json$/i.test(f))
    .sort();
  if (!files.length) throw new Error('No GROK47-PRICE-TABLE-*.json in docs/evidence');
  return join(evidence, files[files.length - 1]);
}

function patchM6InSpec(src, id, fullEur) {
  // Replace M6 inside the anchorByPhase block for this deliverableId only.
  const idRe = new RegExp(
    `(deliverableId:\\s*'${id}'[\\s\\S]*?anchorByPhase:\\s*\\{[\\s\\S]*?M6:\\s*)(\\d+)`,
  );
  if (!idRe.test(src)) {
    throw new Error(`M6 not found for ${id} in package-delivery-spec`);
  }
  return src.replace(idRe, `$1${fullEur}`);
}

function patchCatalogAnchor(src, id, fullEur) {
  const re = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?anchorEur:\\s*)(\\d+)`);
  if (!re.test(src)) {
    console.warn(`warn: catalog anchor missing for ${id}`);
    return src;
  }
  return src.replace(re, `$1${fullEur}`);
}

function patchIntroDefault(src, discountPct) {
  // Default fallback in readDeliverableIntroPromoSettings: || 15
  return src
    .replace(
      /(DELIVERABLE_INTRO_DISCOUNT_PCT \|\| env\.NEXT_PUBLIC_DELIVERABLE_INTRO_DISCOUNT_PCT \|\| )(\d+)/,
      `$1${discountPct}`,
    )
    .replace(
      /(discountPct > 0 && discountPct < 50 \? discountPct : )(\d+)/,
      `$1${discountPct}`,
    );
}

const jsonPath = resolveJsonPath(process.argv[2]);
const table = JSON.parse(readFileSync(jsonPath, 'utf8'));
const discountPct = Number(table.discountPct) || 15;
const pkgs = table.packages;
if (!Array.isArray(pkgs) || pkgs.length < 15) {
  throw new Error('packages[] missing or too short');
}

const specPaths = [
  join(root, 'atina-platform', 'atina', 'src', 'modules', 'billing', 'lib', 'package-delivery-spec.ts'),
  join(root, 'apps', 'omnigroup-web', 'src', 'lib', 'package-delivery-spec.ts'),
];
const catalogPaths = [
  join(root, 'atina-platform', 'atina', 'src', 'modules', 'billing', 'lib', 'base-deliverable-catalog.ts'),
  join(root, 'apps', 'omnigroup-web', 'src', 'lib', 'deliverable-catalog.ts'),
];
const introPath = join(
  root,
  'atina-platform',
  'atina',
  'src',
  'modules',
  'payments',
  'lib',
  'deliverable-intro-promo.ts',
);
const introTestPath = join(
  root,
  'atina-platform',
  'atina',
  'src',
  'tests',
  'unit',
  'deliverable-intro-promo.test.ts',
);
const ultimatrixGate = join(
  root,
  'atina-platform',
  'atina',
  'src',
  'modules',
  'billing',
  'lib',
  'ultimatrix-gate.ts',
);

for (const p of specPaths) {
  let src = readFileSync(p, 'utf8');
  for (const row of pkgs) {
    src = patchM6InSpec(src, row.id, row.fullEur);
  }
  writeFileSync(p, src, 'utf8');
  console.log('patched M6', p);
}

for (const p of catalogPaths) {
  let src = readFileSync(p, 'utf8');
  for (const row of pkgs) {
    src = patchCatalogAnchor(src, row.id, row.fullEur);
  }
  writeFileSync(p, src, 'utf8');
  console.log('patched catalog', p);
}

{
  let intro = readFileSync(introPath, 'utf8');
  intro = patchIntroDefault(intro, discountPct);
  writeFileSync(introPath, intro, 'utf8');
  console.log('intro default discountPct ->', discountPct);
}

// Keep unit + ultimatrix gates honest about default pct
for (const p of [introTestPath, ultimatrixGate]) {
  let src = readFileSync(p, 'utf8');
  src = src.replace(/discountPct:\s*15/g, `discountPct: ${discountPct}`);
  src = src.replace(/discountPct !== 15/g, `discountPct !== ${discountPct}`);
  src = src.replace(/15%\/50/g, `${discountPct}%/50`);
  src = src.replace(/enabled 15%\/50/g, `enabled ${discountPct}%/50`);
  // intro math: 1000 * (1 - pct/100)
  const charge = Math.round(1000 * (1 - discountPct / 100));
  src = src.replace(/chargeEur:\s*850/g, `chargeEur: ${charge}`);
  src = src.replace(/charge 850/g, `charge ${charge}`);
  src = src.replace(/got \$\{introOpen\.chargeEur\}/g, `got \${introOpen.chargeEur}`);
  if (src.includes('introOpen.chargeEur !== 850')) {
    src = src.replace('introOpen.chargeEur !== 850', `introOpen.chargeEur !== ${charge}`);
  }
  if (src.includes('expect(priced.chargeEur).toBe(850)')) {
    src = src.replace('expect(priced.chargeEur).toBe(850)', `expect(priced.chargeEur).toBe(${charge})`);
  }
  writeFileSync(p, src, 'utf8');
  console.log('patched expectations', p);
}

console.log('OK applied', jsonPath, 'packages=', pkgs.length, 'intro=', discountPct);

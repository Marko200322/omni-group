#!/usr/bin/env node
/**
 * Sync clean UTF-8 catalog strings from Atina → web mirrors.
 * Fixes U+FFFD mojibake on pricing/services pages.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function countFffd(s) {
  return (s.match(/\uFFFD/g) || []).length;
}

function extractArrayLiteral(src, exportName) {
  const re = new RegExp(`export const ${exportName}[\\s\\S]*?=\\s*(\\[[\\s\\S]*?\\n\\];)`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`array ${exportName} not found`);
  return m[1].replace(/;\s*$/, '');
}

function extractQuotedStrings(src) {
  const out = [];
  const re = /'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1].replace(/\\'/g, "'"));
  return out;
}

// 1) deliverable-catalog RAW array from atina base catalog
{
  const atina = fs.readFileSync(
    path.join(root, 'atina-platform/atina/src/modules/billing/lib/base-deliverable-catalog.ts'),
    'utf8',
  );
  const webPath = path.join(root, 'apps/omnigroup-web/src/lib/deliverable-catalog.ts');
  let web = fs.readFileSync(webPath, 'utf8');
  const cleanArray = extractArrayLiteral(atina, 'BASE_DELIVERABLE_CATALOG');
  const next = web.replace(
    /const DELIVERABLE_CATALOG_RAW: DeliverableDefinition\[\] = \[[\s\S]*?\];/,
    `const DELIVERABLE_CATALOG_RAW: DeliverableDefinition[] = ${cleanArray};`,
  );
  if (next === web) throw new Error('deliverable-catalog RAW array not replaced');
  fs.writeFileSync(webPath, next, 'utf8');
  console.log('deliverable-catalog FFFD', countFffd(web), '→', countFffd(next));
}

// 2) package-delivery-spec: replace corrupted quoted strings with atina matches
{
  const aPath = path.join(root, 'atina-platform/atina/src/modules/billing/lib/package-delivery-spec.ts');
  const wPath = path.join(root, 'apps/omnigroup-web/src/lib/package-delivery-spec.ts');
  const aSpec = fs.readFileSync(aPath, 'utf8');
  let wSpec = fs.readFileSync(wPath, 'utf8');
  const before = countFffd(wSpec);
  const aStrs = extractQuotedStrings(aSpec);
  const wStrs = extractQuotedStrings(wSpec);
  let replaced = 0;

  for (const ws of wStrs) {
    if (!ws.includes('\uFFFD')) continue;
    const stripped = ws.replace(/\uFFFD/g, '');
    const key = stripped.slice(0, 28);
    let best = null;
    let bestScore = -1;
    for (const as of aStrs) {
      if (!as || as.includes('\uFFFD')) continue;
      if (Math.abs(as.length - ws.length) > 12) continue;
      const aStrip = as.replace(/[—–−]/g, '');
      let score = 0;
      if (key && as.includes(key.slice(0, Math.min(16, key.length)))) score += 10;
      if (as.startsWith(stripped.slice(0, 10))) score += 5;
      // shared prefix length
      let i = 0;
      while (i < as.length && i < stripped.length && as[i] === stripped[i]) i++;
      score += i;
      if (score > bestScore) {
        bestScore = score;
        best = as;
      }
    }
    if (best && bestScore >= 16) {
      const from = `'${ws.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      const to = `'${best.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      // Use split/join on original unescaped form
      const rawFrom = `'${ws}'`;
      const rawTo = `'${best}'`;
      if (wSpec.includes(rawFrom)) {
        wSpec = wSpec.split(rawFrom).join(rawTo);
        replaced += 1;
      }
    }
  }

  // leftover FFFD heuristics
  wSpec = wSpec.replace(/\uFFFD/g, (_, __, offset) => {
    // can't get neighbors easily with replace callback without str — use function form
    return '—';
  });
  // refine digit–digit
  wSpec = wSpec.replace(/(\d)—(\d)/g, '$1–$2');

  fs.writeFileSync(wPath, wSpec, 'utf8');
  console.log('package-delivery-spec stringHits=', replaced, 'FFFD', before, '→', countFffd(wSpec));
}

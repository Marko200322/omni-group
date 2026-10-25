#!/usr/bin/env node
/**
 * Fix web package-delivery-spec where š/č/ć/ž were corrupted into em-dash (—).
 * Prefer Atina source strings; fall back to known replacements.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aPath = path.join(root, 'atina-platform/atina/src/modules/billing/lib/package-delivery-spec.ts');
const wPath = path.join(root, 'apps/omnigroup-web/src/lib/package-delivery-spec.ts');

function quoted(src) {
  const out = [];
  const re = /'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({ raw: m[0], inner: m[1].replace(/\\'/g, "'") });
  }
  return out;
}

function skeleton(s) {
  return s.replace(/[^\x00-\x7F]/g, '').replace(/[—–−]/g, '');
}

const corruptRe = /[A-Za-z]—[A-Za-z]|—[a-z]{3,}/;
const a = fs.readFileSync(aPath, 'utf8');
let w = fs.readFileSync(wPath, 'utf8');
const aStrs = quoted(a);
const wStrs = quoted(w);
let fixed = 0;

for (const ws of wStrs) {
  if (!corruptRe.test(ws.inner)) continue;
  const sk = skeleton(ws.inner);
  let best = null;
  let bestScore = 0;
  for (const as of aStrs) {
    if (corruptRe.test(as.inner)) continue;
    const ask = skeleton(as.inner);
    let score = 0;
    if (ask.slice(0, 24) === sk.slice(0, 24)) score += 20;
    let i = 0;
    while (i < ask.length && i < sk.length && ask[i] === sk[i]) i += 1;
    score += Math.min(i, 80);
    if (Math.abs(as.inner.length - ws.inner.length) < 40) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = as;
    }
  }
  if (best && bestScore >= 30 && best.inner !== ws.inner && w.includes(ws.raw)) {
    w = w.split(ws.raw).join(best.raw);
    fixed += 1;
    console.log('ATINA', ws.inner.slice(0, 70), '=>', best.inner.slice(0, 70));
  } else {
    console.log('NOMATCH', bestScore, ws.inner.slice(0, 90));
  }
}

const manual = [
  ['na—eg', 'našeg'],
  ['obave—tenje', 'obaveštenje'],
  ['sequence —abloni', 'sequence šabloni'],
  ['po—ten', 'pošten'],
  ['izmi—lja', 'izmišlja'],
  ['mo—e PASS', 'može PASS'],
  ['shown as —coming with factory growth—', 'shown as "coming with factory growth"'],
];
for (const [from, to] of manual) {
  if (w.includes(from)) {
    w = w.split(from).join(to);
    fixed += 1;
    console.log('MANUAL', from, '->', to);
  }
}

fs.writeFileSync(wPath, w, 'utf8');
const left = [...w.matchAll(/[A-Za-z]—[A-Za-z]|—[a-z]{3,}/g)].map((m) => m[0]);
console.log(JSON.stringify({ fixed, remainingCorrupt: left }, null, 2));

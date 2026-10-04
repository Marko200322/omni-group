/**
 * Source guards: problem-hunter operator surfaces must stay admin-gated
 * (web requireAdminSession + Atina requireAdmin), matching hunting BFFs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..');

function readWeb(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function readRepo(rel) {
  return readFileSync(join(repo, rel), 'utf8');
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const status = readWeb('src/app/api/atina/problem-hunter/status/route.ts');
const signals = readWeb('src/app/api/atina/problem-hunter/signals/route.ts');
const searchRun = readWeb('src/app/api/atina/problem-hunter/search/run/route.ts');
const huntingReadiness = readWeb('src/app/api/atina/hunting/readiness/route.ts');
const mod = readRepo('atina-platform/atina/src/modules/problem-hunter/problem-hunter.module.ts');

for (const [name, src] of [
  ['status', status],
  ['signals', signals],
  ['search/run', searchRun],
]) {
  assert(src.includes('requireAdminSession'), `problem-hunter ${name} BFF must use requireAdminSession`);
  assert(!src.includes('getServerSession'), `problem-hunter ${name} BFF must not use bare getServerSession`);
}

assert(huntingReadiness.includes('requireAdminSession'), 'hunting readiness remains the admin-gate reference');

assert(mod.includes("'/status'"), 'Atina problem-hunter registers /status');
assert(mod.includes("'/signals'"), 'Atina problem-hunter registers /signals');
assert(mod.includes("'/search/run'"), 'Atina problem-hunter registers /search/run');

const statusBlock = mod.slice(mod.indexOf("'/status'"), mod.indexOf("'/signals'"));
const signalsBlock = mod.slice(mod.indexOf("'/signals'"), mod.indexOf("'/search/run'"));
const searchBlock = mod.slice(mod.indexOf("'/search/run'"));

for (const [name, block] of [
  ['status', statusBlock],
  ['signals', signalsBlock],
  ['search/run', searchBlock],
]) {
  assert(block.includes('authenticate'), `Atina problem-hunter ${name} must authenticate`);
  assert(block.includes('requireAdmin'), `Atina problem-hunter ${name} must requireAdmin`);
}

console.log('test-problem-hunter-admin: ok');

#!/usr/bin/env node
/**
 * Local probe: same SKU with two payments must produce different bound bodies.
 * Run from repo root after Atina deps installed:
 *   node scripts/test-package-order-variety.mjs
 *
 * Full live E2E (when VPS up): .\scripts\e2e-billing-prod.ps1 -DeliverableId audit
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const atinaRoot = path.join(__dirname, '..', 'atina-platform', 'atina');
const require = createRequire(path.join(atinaRoot, 'package.json'));

// Prefer compiled dist if present; otherwise instruct jest path.
async function main() {
  process.chdir(atinaRoot);
  const { spawnSync } = await import('child_process');
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['jest', 'src/tests/unit/order-variety.test.ts', '--runInBand', '--no-coverage'],
    { stdio: 'inherit', shell: true, cwd: atinaRoot },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);

  // Lightweight fingerprint note for humans
  const stamp = createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 8);
  console.log(`\norder-variety unit PASS · stamp=${stamp}`);
  console.log('Next (when prod reachable): .\\scripts\\e2e-billing-prod.ps1 -DeliverableId audit');
  console.log('  then repeat with a second ClientEmail and diff artifact bodies / contentOrderRef.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

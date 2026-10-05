/**
 * OmniTrix static gate — claim depth + UltrMatrix readiness scores.
 * Runs against Atina SSOT via dynamic import of compiled path is heavy;
 * instead mirrors problem-depth + delivery include counts from shared JSON emit.
 *
 * For full audit use: cd atina-platform/atina && npx jest omnitrix-spec --runInBand
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const atina = join(root, 'atina-platform', 'atina');
const evidenceDir = join(root, 'docs', 'evidence');

console.log('OmniTrix: running Jest omnitrix-spec + package problem depth…');
const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['jest', 'src/tests/unit/omnitrix-spec.test.ts', '--runInBand', '--forceExit'],
  { cwd: atina, encoding: 'utf8', env: { ...process.env, JEST_CACHE_DIRECTORY: join(root, '.tmp', 'jest') } },
);
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');

mkdirSync(evidenceDir, { recursive: true });
const out = join(evidenceDir, 'omnitrix-ultrimatrix-20261005.txt');
writeFileSync(
  out,
  [
    `exit=${r.status}`,
    'suite=omnitrix-spec.test.ts',
    '--- stdout ---',
    r.stdout || '',
    '--- stderr ---',
    r.stderr || '',
  ].join('\n'),
  'utf8',
);

if (r.status !== 0) {
  console.error('OmniTrix FAIL — see', out);
  process.exit(1);
}
console.log('OmniTrix PASS — evidence', out);

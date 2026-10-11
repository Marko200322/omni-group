/**
 * Ultimatrix — full monorepo automated gate (fail-closed, hashed evidence).
 * Every PASS writes sha256 of suite output so agents cannot claim PASS without artifacts.
 *
 * Usage (repo root):
 *   node scripts/test-ultimatrix.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const atina = join(root, 'atina-platform', 'atina');
const web = join(root, 'apps', 'omnigroup-web');
const evidenceDir = join(root, 'docs', 'evidence');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const startedAt = new Date().toISOString();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function sha256(text) {
  return createHash('sha256').update(text || '', 'utf8').digest('hex');
}

function run(label, command, args, cwd) {
  console.log(`\n== Ultimatrix: ${label} ==`);
  const cmdline = [command, ...args.map((a) => (/\s/.test(a) ? `"${a}"` : a))].join(' ');
  const r = spawnSync(cmdline, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      JEST_CACHE_DIRECTORY: join(root, '.tmp', 'jest'),
    },
    shell: true,
    windowsHide: true,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
  return {
    label,
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    sha256: sha256(combined),
    bytes: Buffer.byteLength(combined, 'utf8'),
  };
}

const suites = [
  'src/tests/unit/omnitrix-spec.test.ts',
  'src/tests/unit/ultimatrix-spec.test.ts',
  'src/tests/unit/fulfillment-quality-checklist.test.ts',
  'src/tests/unit/deliverable-intro-promo.test.ts',
  'src/tests/unit/support-ticket-agent.service.test.ts',
];

const results = [];

results.push(
  run(
    'atina-jest-ultimatrix-suites',
    npx,
    ['jest', ...suites, '--runInBand', '--forceExit'],
    atina,
  ),
);

results.push(run('web-delivery-honesty', npm, ['run', 'test:honesty'], web));
results.push(run('web-public-catalog', npm, ['run', 'test:catalog'], web));

mkdirSync(evidenceDir, { recursive: true });
const failed = results.filter((r) => r.status !== 0);
const endedAt = new Date().toISOString();

const summary = {
  agent: 'ULTIMATRIX',
  stamp,
  startedAt,
  endedAt,
  ok: failed.length === 0,
  failed: failed.map((f) => f.label),
  rule: 'Every PASS requires this JSON/TXT on disk with matching sha256 — chat claims without files are invalid',
  gates: [
    'product/service + invoice (not PDF theater)',
    'support AI solver wired',
    'intro −15% first 50 → full list',
    'atina↔web M6 price sync',
    'web honesty + catalog',
  ],
  markoOnlyDeferred: ['firma/VAT', 'Stripe LIVE', 'PayPal/Wise/Kriptoman'],
  results: results.map((r) => ({
    label: r.label,
    status: r.status,
    pass: r.status === 0,
    sha256: r.sha256,
    bytes: r.bytes,
    stdoutTail: r.stdout.slice(-4000),
    stderrTail: r.stderr.slice(-2000),
  })),
};

const outJson = join(evidenceDir, `ultimatrix-FULL-${stamp}.json`);
const outTxt = join(evidenceDir, `ultimatrix-FULL-${stamp}.txt`);
const outLatest = join(evidenceDir, 'ultimatrix-LATEST.txt');

writeFileSync(outJson, JSON.stringify(summary, null, 2), 'utf8');
const txtBody = [
  `ok=${summary.ok}`,
  `failed=${failed.length}`,
  `startedAt=${startedAt}`,
  `endedAt=${endedAt}`,
  `evidenceJson=${outJson}`,
  ...results.map(
    (r) =>
      `${r.status === 0 ? 'PASS' : 'FAIL'} ${r.label} exit=${r.status} sha256=${r.sha256} bytes=${r.bytes}`,
  ),
  '',
  'Suites: omnitrix + ultimatrix + fulfillment checklist + intro promo + support AI agent',
  'Web: honesty + public catalog consistency/surfaces',
  'Gate: product/service + invoice + support solver + intro first-50 then full + atina↔web M6 price sync',
  'Marko deferred: firma + Stripe LIVE + PayPal/Wise/Kriptoman',
  'Agent rule: no PASS without this file + matching JSON sha256 lines',
].join('\n');
writeFileSync(outTxt, txtBody, 'utf8');
writeFileSync(outLatest, txtBody, 'utf8');

if (failed.length > 0) {
  console.error('\nUltimatrix FAIL — see', outTxt);
  process.exit(1);
}
console.log('\nUltimatrix PASS — evidence', outTxt);
console.log('Ultimatrix LATEST —', outLatest);

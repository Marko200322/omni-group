/**
 * Master public-platform QA. Does not invent live Stripe or legal-registration results.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const jobs = [
  { priority: 'P0', area: 'Catalog / price consistency', file: 'scripts/test-public-catalog-consistency.mjs' },
  { priority: 'P0', area: 'Catalog surfaces', file: 'scripts/test-public-catalog-surfaces.mjs' },
  { priority: 'P0', area: 'Checkout / auth surfaces', file: 'scripts/test-auth-surfaces.mjs' },
  { priority: 'P0', area: 'Contact validation', file: 'scripts/test-contact-validation.mjs' },
  { priority: 'P0', area: 'Delivery honesty', file: 'scripts/test-delivery-honesty.mjs' },
  { priority: 'P1', area: 'Industry landings (907)', file: 'scripts/audit-industry-landings.mjs' },
  { priority: 'P1', area: 'Industry SKU mapping', file: 'scripts/test-industry-sku-map.mjs' },
  { priority: 'P1', area: 'Industry intelligence', file: 'scripts/analyze-industry-intelligence.mjs' },
  { priority: 'P0', area: 'Buy Now intent preservation', file: 'scripts/test-buy-now-intent.mjs' },
  { priority: 'P0', area: 'Fulfillment map', file: 'scripts/test-fulfillment-map.mjs' },
  { priority: 'P1', area: 'SaaS monthly/yearly cycle', file: 'scripts/test-saas-cycle.mjs' },
  { priority: 'P1', area: 'Legal consistency', file: 'scripts/test-legal-consistency.mjs' },
  { priority: 'P0', area: 'Isolation source guards', file: 'scripts/test-isolation-guards.mjs' },
  { priority: 'P1', area: 'SEO public sources', file: 'scripts/test-seo-public.mjs' },
  { priority: 'P1', area: 'SaaS plan-limit documentation', file: 'scripts/test-plan-limits.mjs' },
  { priority: 'P2', area: 'Workspace routes', file: 'scripts/test-workspace-routes.mjs' },
  { priority: 'P2', area: 'Atina normalize', file: 'scripts/test-atina-normalize.mjs' },
];

const rows = [];
let failed = 0;

for (const job of jobs) {
  const result = spawnSync(process.execPath, [join(root, job.file)], {
    cwd: root,
    encoding: 'utf8',
  });
  const ok = result.status === 0;
  if (!ok) failed += 1;
  const problem = ok
    ? '—'
    : (result.stderr || result.stdout || 'failed')
        .trim()
        .split('\n')
        .find((line) => line.startsWith('Error:')) ||
      (result.stderr || result.stdout || 'failed').trim().split('\n').at(-1);
  rows.push({
    PRIORITY: job.priority,
    AREA: job.area,
    PROBLEM: problem,
    FILE: job.file,
    STATUS: ok ? 'PASS' : 'FAILED',
  });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${job.area}\n`);
  if (!ok) process.stdout.write(`${problem}\n`);
}

console.log('\nPRIORITY\tAREA\tSTATUS\tFILE\tPROBLEM');
for (const row of rows) {
  console.log(`${row.PRIORITY}\t${row.AREA}\t${row.STATUS}\t${row.FILE}\t${row.PROBLEM}`);
}

console.log(
  `\nPRODUCTION READINESS CHECKS: ${rows.length}  PASS: ${rows.filter((r) => r.STATUS === 'PASS').length}  FAILED: ${failed}`,
);
console.log(
  'NEEDS HUMAN TEST: Stripe TEST/LIVE card through hosted Checkout so the webhook (not admin confirm) is the paid event; yearly paid subscription; password-reset inbox; refund in Stripe Dashboard.',
);
console.log(
  'NEEDS HUMAN DECISION: formal company registration details; align marketing plan limits (workspaces/users/contacts) with DB seed keys (tasks/team_members/modules).',
);

if (failed) process.exit(1);

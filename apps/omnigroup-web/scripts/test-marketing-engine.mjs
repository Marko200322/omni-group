/**
 * Static + shape guards for Marketing Intelligence engine surfaces.
 * Paired with scripts/verify-marketing-engine-matrix-prod.ps1 on prod.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

const required = [
  'src/app/api/atina/marketing/overview/route.ts',
  'src/app/api/atina/marketing/email-engagement/route.ts',
  'src/app/api/atina/marketing/package-matrix/route.ts',
  'src/app/api/atina/marketing/adapters/sync/route.ts',
  'src/app/admin/marketing/page.tsx',
  'src/components/platform/MarketingPanel.tsx',
];

for (const rel of required) {
  assert(existsSync(join(root, rel)), `missing ${rel}`);
}

const panel = read('src/components/platform/MarketingPanel.tsx');
assert(panel.includes("'email'"), 'MarketingPanel must expose email tab');
assert(panel.includes("'packages'"), 'MarketingPanel must expose packages tab');
assert(panel.includes('adapters/sync'), 'MarketingPanel must call adapters/sync');
assert(panel.includes('email-engagement'), 'MarketingPanel must load email-engagement');
assert(panel.includes('package-matrix'), 'MarketingPanel must load package-matrix');

const routes = read('src/lib/workspace-routes.ts');
assert(routes.includes('marketing') || routes.includes('/admin/marketing'), 'workspace routes must include marketing');

const atinaRoot = join(root, '../../atina-platform/atina');
const pay = readFileSync(join(atinaRoot, 'src/modules/payments/service/payments.service.ts'), 'utf8');
assert(pay.includes('dispatchPaymentAttribution'), 'payments must auto-dispatch marketing attribution');

const adapters = readFileSync(join(atinaRoot, 'src/modules/marketing/lib/adapters.ts'), 'utf8');
assert(adapters.includes('MARKETING_ADS_LIVE_SYNC'), 'ads adapters must gate on MARKETING_ADS_LIVE_SYNC');
assert(adapters.includes('GoogleAdsAdapter'), 'Google LIVE adapter required');
assert(adapters.includes('MetaAdsAdapter'), 'Meta LIVE adapter required');

const email = readFileSync(join(atinaRoot, 'src/modules/marketing/lib/email-engagement.ts'), 'utf8');
assert(email.includes('ingestResendWebhookPayload'), 'email open/click engine required');

const mod = readFileSync(join(atinaRoot, 'src/modules/marketing/marketing.module.ts'), 'utf8');
assert(mod.includes('/webhooks/resend'), 'Resend webhook route required');
assert(mod.includes('/email-engagement'), 'email-engagement route required');
assert(mod.includes('/package-matrix'), 'package-matrix route required');

const mig = join(atinaRoot, 'src/database/migrations/047_marketing_email_and_package_matrix.sql');
assert(existsSync(mig), 'migration 047 required');

console.log('test-marketing-engine: ok');

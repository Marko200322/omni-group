/**
 * Source-of-truth map: payment webhook → handler → artifacts.
 * Does not claim a live Stripe charge completed.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function readRepo(rel) {
  return readFileSync(join(repo, rel), 'utf8');
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const catalog = read('src/lib/deliverable-catalog.ts');
const honesty = read('src/lib/delivery-honesty.ts');
const payments = readRepo('atina-platform/atina/src/modules/payments/service/payments.service.ts');
const registry = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/registry.ts');
const setup = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/setup.handler.ts');
const website = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/website.handler.ts');
const consulting = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/consulting-doc.handler.ts');
const retainer = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/retainer.handler.ts');
const growth = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/vertical-growth.handler.ts');
const custom = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/custom-software.handler.ts');
const bundle = readRepo('atina-platform/atina/src/modules/billing/lib/deliverable-handlers/bundle.handler.ts');

assert(payments.includes('handleDeliverableStripeCheckoutCompleted'), 'Webhook handler must exist');
assert(payments.includes("session.payment_status !== 'paid'"), 'Webhook must ignore unpaid success redirects');
assert(payments.includes("confirmPendingPayment(paymentId, 'stripe-webhook', 'stripe')"), 'Webhook must confirm payment');
assert(payments.includes("already confirmed"), 'Webhook retries must be idempotent');
assert(payments.includes('charge.refunded'), 'Webhook must mark Stripe refunds');
assert(payments.includes('markPaymentRefunded'), 'Refunded charges must update payment status');
assert(payments.includes('getPackageAnchorEur') || payments.includes('getSaaSPrice'), 'Checkout must re-price on the server');

const handlers = [registry, setup, website, consulting, retainer, growth, custom, bundle].join('\n');
const ids = [...catalog.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
assert(ids.length >= 20, `Expected 20 catalog IDs, found ${ids.length}`);
for (const id of ids) {
  assert(handlers.includes(`'${id}'`), `${id} missing from fulfillment handlers`);
  assert(honesty.includes(`deliverableId: '${id}'`), `${id} missing automation classification`);
}

assert(setup.includes("filename: `setup-${tier}.pdf`"), 'Setup must persist a PDF');
assert(setup.includes('persistMarkdownBundle'), 'Setup must persist markdown');
assert(setup.includes('runAutomatedClientOrder'), 'Setup must create a project');
assert(setup.includes('saveMigrationTemplate'), 'Full onboarding must create a migration CSV');
assert(setup.includes('saveTrainingOutline'), 'Full onboarding must create a training outline');
assert(setup.includes('scheduleSupportWindow'), 'Full onboarding must open a support window');
assert(setup.includes('saveProductionDeployManifest'), 'Custom deploy must write a deploy manifest — not a live VPS');
assert(consulting.includes('technical-audit.pdf'), 'Audit must generate a PDF');
assert(consulting.includes('workflow-sop-pack.pdf'), 'Workflow design must generate a PDF');
assert(consulting.includes('integration-guide.pdf'), 'Integration must generate a PDF');
assert(website.includes("ids: ['landing', 'website-business', 'website-ecommerce']"), 'Website handler covers landing + business + ecommerce');
assert(website.includes('publishSite: true'), 'Website handler publishes a hosted URL');
assert(website.includes('ecommerceCatalog'), 'Ecommerce fulfillment records a demo catalog');
assert(retainer.includes('lead-gen-retainer'), 'Lead gen has a retainer handler');
assert(retainer.includes('saveLeadGenReport'), 'Lead gen writes a report artifact');
assert(custom.includes('custom-software'), 'Software starter kit has a handler');
assert(!honesty.includes("automationLevel: 'AUTOMATED'") || honesty.includes("'setup-custom'"), 'Honesty table must exist');
assert(honesty.includes("automationLevel: 'HUMAN_DELIVERY'"), 'Human-required packages must stay classified');

console.log('test-fulfillment-map: ok');

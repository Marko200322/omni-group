/**
 * Source guards for customer isolation. Does not claim a live A/B IDOR run.
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

const fulfillmentRead = readRepo(
  'atina-platform/atina/src/modules/billing/service/deliverable-fulfillment-read.service.ts',
);
const billing = readRepo('atina-platform/atina/src/modules/billing/service/billing.service.ts');
const paymentsController = readRepo(
  'atina-platform/atina/src/modules/payments/controller/payments.controller.ts',
);
const shop = readRepo('atina-platform/atina/src/modules/public-site/service/public-site.service.ts');
const deliverableCheckout = read('src/app/api/atina/payments/stripe/deliverable-checkout/route.ts');

assert(fulfillmentRead.includes('row.user_id !== userId'), 'Fulfillment jobs must be scoped to the owner');
assert(fulfillmentRead.includes('AuthorizationError'), 'Cross-account fulfillment must 403');
assert(billing.includes('getInvoiceById(invoiceId, userId)'), 'Invoices must be loaded with the owner id');
assert(paymentsController.includes('req.user!.userId') || paymentsController.includes('req.user.userId'), 'Payment history must use the session user');
assert(shop.includes('priceShopItemsFromCatalog'), 'Shop checkout must reprice from the site catalog');
assert(
  !shop.includes('body.items.reduce((sum, item) => sum + item.priceEur'),
  'Shop checkout must not total client-supplied priceEur',
);
assert(
  !/unit_amount.*body\.|amount:\s*body|Number\(body\.amount\)/.test(deliverableCheckout),
  'Deliverable checkout BFF must not take a client amount',
);

console.log('test-isolation-guards: ok (source guards; live A/B is scripts/e2e-isolation-prod.ps1)');

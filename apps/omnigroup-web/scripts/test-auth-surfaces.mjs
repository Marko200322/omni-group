/**
 * Source-level auth/session guards. Does not claim a live password-reset email works.
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

const middleware = read('src/middleware.ts');
const stripeCheckout = read('src/app/api/atina/payments/stripe/checkout/route.ts');
const deliverableCheckout = read('src/app/api/atina/payments/stripe/deliverable-checkout/route.ts');
const payments = readRepo('atina-platform/atina/src/modules/payments/service/payments.service.ts');

assert(middleware.includes("'/dashboard'"), 'Dashboard must be a protected prefix');
assert(middleware.includes("'/admin'"), 'Admin must be a protected prefix');
assert(middleware.includes("'/api/auth/login'"), 'Login must be rate-limited');
assert(middleware.includes("'/api/auth/register'"), 'Register must be rate-limited');
assert(middleware.includes("'/api/auth/forgot-password'"), 'Forgot-password must be rate-limited');
assert(middleware.includes("'/api/auth/reset-password'"), 'Reset-password must be rate-limited');
assert(
  !/unit_amount.*body\.|amount:\s*body|Number\(body\.amount\)/.test(stripeCheckout),
  'Plan checkout BFF must not take a client amount',
);
assert(
  !/unit_amount.*body\.|amount:\s*body|Number\(body\.amount\)/.test(deliverableCheckout),
  'Deliverable checkout BFF must not take a client amount',
);
assert(payments.includes('getPackageAnchorEur'), 'Atina must re-price deliverables from the catalog');

console.log('test-auth-surfaces: ok');

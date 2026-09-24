/**
 * Contact intake and BFF must share the same validation rules.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const intake = read('src/lib/contact-intake.ts');
const route = read('src/app/api/contact/route.ts');
const form = read('src/app/(marketing)/contact/ContactForm.tsx');
const middleware = read('src/middleware.ts');

assert(intake.includes('isValidContactEmail'), 'Shared email validator must exist');
assert(intake.includes('parseContactMessage'), 'Shared message validator must exist');
assert(intake.includes('CONTACT_MESSAGE_MIN_LEN'), 'Message min length must be shared');
assert(intake.includes('parseContactConsent'), 'Consent parser must stay shared');
assert(route.includes('isValidContactEmail'), 'Contact API must reject invalid email');
assert(route.includes('parseContactMessage'), 'Contact API must reject short/long messages');
assert(route.includes('consent_required'), 'Contact API must require consent');
assert(form.includes('name="consent"'), 'Form must post consent');
assert(form.includes('required'), 'Form must mark required fields');
assert(form.includes('invalid_email'), 'Form must surface invalid email');
assert(form.includes('message_too_short'), 'Form must surface short-message errors');
assert(form.includes('disabled={status === \'loading\' || !consent}'), 'Submit must stay blocked without consent');
assert(middleware.includes("'/api/contact'"), 'Contact route must be rate-limited');

console.log('test-contact-validation: ok');

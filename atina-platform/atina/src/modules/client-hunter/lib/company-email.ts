/**
 * Commercial / company-email helpers for hunting + outbound.
 * Government boards and free-mail inboxes are not B2B lead targets.
 */

const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.de',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.de',
  'web.de',
  'mail.com',
  'yandex.com',
  'yandex.ru',
]);

const BLOCKED_ORG_DOMAINS = new Set([
  'arbeitsagentur.de',
  'francetravail.fr',
  'pole-emploi.fr',
  'emploi-store.fr',
  'arbetsformedlingen.se',
  'gov.uk',
  'service.gov.uk',
  'bund.de',
  'example.com',
  'example.org',
  'test.com',
  'omnigroup.local',
  'atina.io',
  'localhost',
]);

const BLOCKED_HOST_SNIPPETS = [
  'indeed.',
  'stepstone.',
  'linkedin.',
  'xing.com',
  'glassdoor.',
  'monster.',
  'ziprecruiter.',
  'upwork.',
  'fiverr.',
  'freelancer.',
];

export function emailDomain(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 0) return '';
  return e.slice(at + 1);
}

export function isBlockedOrgDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase().replace(/^www\./, '');
  if (!d) return true;
  if (BLOCKED_ORG_DOMAINS.has(d)) return true;
  if (d.endsWith('.gov') || d.endsWith('.gov.uk') || d.endsWith('.gv.at')) return true;
  if (d.includes('.gov.') || d.endsWith('.gouv.fr')) return true;
  if (BLOCKED_HOST_SNIPPETS.some((s) => d === s.replace(/\.$/, '') || d.includes(s))) return true;
  return false;
}

/** True for work / company inboxes (not free-mail, not gov/job-board hosts). */
export function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes('@')) return false;
  const e = email.trim().toLowerCase();
  if (e.startsWith('smoke@') || e.startsWith('smoke+') || e.startsWith('opscheck@')) return false;
  const domain = emailDomain(e);
  if (!domain || !domain.includes('.')) return false;
  if (FREE_MAIL_DOMAINS.has(domain)) return false;
  if (isBlockedOrgDomain(domain)) return false;
  if (domain.includes('example-') || domain.endsWith('.demo')) return false;
  return true;
}

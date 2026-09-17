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

/** True when platform kind is excluded from commercial hunts (default: government). */
export function isExcludedHuntPlatformKind(
  kind: string | null | undefined,
  excludeKinds: readonly string[] = ['government'],
): boolean {
  if (!kind) return false;
  return excludeKinds.includes(kind);
}

const HOT_CLIENT_EMAIL_KEYS = ['contact_email', 'email', 'lead_email', 'recipient_email'] as const;

/** Resolve a contact email from hot-client input or metadata (if present). */
export function extractHotClientContactEmail(input: {
  contactEmail?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  if (input.contactEmail?.trim()) return input.contactEmail.trim();
  const md = input.metadata;
  if (!md) return null;
  for (const key of HOT_CLIENT_EMAIL_KEYS) {
    const v = md[key];
    if (typeof v === 'string' && v.includes('@')) return v.trim();
  }
  return null;
}

export type HotClientPersistGateInput = {
  platformKind?: string | null;
  contactEmail?: string | null;
  hasEmail?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type HotClientPersistGateOptions = {
  excludePlatformKinds?: readonly string[];
  companyEmailsOnly?: boolean;
};

/**
 * Gate hot_clients inserts: skip gov/excluded boards; when an email is known,
 * require a company inbox (never free-mail or gov hosts).
 */
export function passesHotClientPersistGate(
  input: HotClientPersistGateInput,
  opts: HotClientPersistGateOptions = {},
): boolean {
  const excludeKinds = opts.excludePlatformKinds ?? ['government'];
  if (isExcludedHuntPlatformKind(input.platformKind, excludeKinds)) return false;

  const contactEmail = extractHotClientContactEmail(input);
  const companyOnly = opts.companyEmailsOnly !== false;

  if (contactEmail) {
    return companyOnly ? isCompanyEmail(contactEmail) : true;
  }
  if (input.hasEmail && companyOnly) {
    return false;
  }
  return true;
}

const PUBLIC_CONTACT_EMAIL = 'hello@omnigrouptech.com';
const PERSONAL_INBOX = /@(gmail|googlemail|outlook|hotmail|yahoo)\.com$/i;
const TRANSACTIONAL_LOCAL = /^(noreply|no-reply|mailer-daemon)@/i;

export function isPublicContactEmail(value: string): boolean {
  return Boolean(value) && !PERSONAL_INBOX.test(value) && !TRANSACTIONAL_LOCAL.test(value);
}

/** Public company identity — set via deploy.config → NEXT_PUBLIC_* on web. */
export function getSiteCompany() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://omnigrouptech.com').replace(/\/$/, '');
  const configuredSupport = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || '';
  // Never render personal inboxes or transactional From addresses. Do not invent support@ / billing@.
  const supportEmail = isPublicContactEmail(configuredSupport) ? configuredSupport : PUBLIC_CONTACT_EMAIL;

  return {
    brand: 'Omni Group Tech',
    legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME?.trim() || '',
    taxId: process.env.NEXT_PUBLIC_COMPANY_TAX_ID?.trim() || '',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || '',
    supportEmail,
    siteUrl,
    impressumLine(): string {
      const parts = [this.legalName, this.taxId ? `PIB ${this.taxId}` : '', this.address].filter(Boolean);
      return parts.length ? parts.join(' · ') : `${this.brand} · ${supportEmail}`;
    },
  };
}

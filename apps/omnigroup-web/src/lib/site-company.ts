/** Public company identity — set via deploy.config → NEXT_PUBLIC_* on web. */
export function getSiteCompany() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://omnigrouptech.com').replace(/\/$/, '');
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.CONTACT_EMAIL_TO?.trim() ||
    'hello@omnigrouptech.com';

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

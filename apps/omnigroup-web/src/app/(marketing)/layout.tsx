import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  openGraph: marketingOpenGraph('Omni Group Tech'),
  twitter: marketingTwitter('Omni Group Tech'),
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const company = getSiteCompany();
  return (
    <MarketingShell impressum={company.impressumLine()} supportEmail={company.supportEmail}>
      {children}
    </MarketingShell>
  );
}

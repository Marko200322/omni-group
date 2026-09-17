'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CookieBanner } from '@/components/marketing/CookieBanner';
import { PageEnter } from '@/components/motion/PageEnter';

export function MarketingShell({
  children,
  impressum,
  supportEmail,
}: {
  children: React.ReactNode;
  impressum?: string;
  supportEmail?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <PageEnter>{children}</PageEnter>
      </main>
      <Footer impressum={impressum} supportEmail={supportEmail} />
      <CookieBanner />
    </div>
  );
}

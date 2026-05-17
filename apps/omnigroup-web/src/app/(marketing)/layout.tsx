'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageEnter } from '@/components/motion/PageEnter';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <PageEnter>{children}</PageEnter>
      </main>
      <Footer />
    </div>
  );
}

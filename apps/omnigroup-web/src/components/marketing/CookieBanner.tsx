'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCookieConsent, writeCookieConsent } from '@/lib/cookie-consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a0a12]/95 p-4 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">
          Essential cookies keep login and checkout working. Optional analytics or ads load only after you accept
          them and only if those IDs are configured. See our{' '}
          <Link href="/legal/cookies" className="text-violet-300 underline hover:text-white">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="btn-glass text-sm"
            onClick={() => {
              writeCookieConsent('essential');
              setVisible(false);
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => {
              writeCookieConsent('analytics');
              setVisible(false);
            }}
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}

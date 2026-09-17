'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ogt_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
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
          We use essential cookies for login and security. See our{' '}
          <Link href="/legal/cookies" className="text-violet-300 underline hover:text-white">
            Cookie Policy
          </Link>
          .
        </p>
        <button
          type="button"
          className="btn-primary shrink-0 text-sm"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, 'essential');
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          Accept essential cookies
        </button>
      </div>
    </div>
  );
}

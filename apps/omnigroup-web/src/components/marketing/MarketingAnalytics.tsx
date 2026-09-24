'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from '@/lib/cookie-consent';

export function MarketingAnalytics() {
  const [allowed, setAllowed] = useState(false);
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();

  useEffect(() => {
    const sync = () => setAllowed(hasAnalyticsConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!domain || !allowed) return null;
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}

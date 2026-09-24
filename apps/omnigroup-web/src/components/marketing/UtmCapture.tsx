'use client';

import { useEffect } from 'react';

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;

export function UtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    if (Object.keys(next).length === 0) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem('og_attribution') ?? '{}') as Record<string, string>;
      sessionStorage.setItem('og_attribution', JSON.stringify({ ...prev, ...next }));
    } catch {
      sessionStorage.setItem('og_attribution', JSON.stringify(next));
    }
  }, []);
  return null;
}

export function readAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem('og_attribution') ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function trackConversion(event: 'sign_up' | 'begin_checkout' | 'generate_lead') {
  const w = window as Window & { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
  w.gtag?.('event', event);
  if (event === 'sign_up') w.fbq?.('track', 'CompleteRegistration');
  if (event === 'begin_checkout') w.fbq?.('track', 'InitiateCheckout');
  if (event === 'generate_lead') w.fbq?.('track', 'Lead');
}

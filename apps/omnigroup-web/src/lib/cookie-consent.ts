export const COOKIE_CONSENT_KEY = 'ogt_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'ogt-cookie-consent';

export type CookieConsentLevel = 'essential' | 'analytics';

export function readCookieConsent(): CookieConsentLevel | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === 'analytics' || value === 'essential') return value;
  } catch {
    return null;
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === 'analytics';
}

export function writeCookieConsent(level: CookieConsentLevel): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, level);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

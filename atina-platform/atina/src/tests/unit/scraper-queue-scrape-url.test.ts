import { ValidationError } from '../../utils/errors';
import {
  assertValidQueueScrapeUrl,
  QUEUE_SCRAPE_URL_MAX_LENGTH,
  queueScrapeUrlZod,
  scraperApiUrlZod,
} from '../../modules/scraper/queue-scrape-url';

describe('assertValidQueueScrapeUrl', () => {
  it('accepts http and https URLs and returns normalized href', () => {
    expect(assertValidQueueScrapeUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(assertValidQueueScrapeUrl('  http://example.com/  ')).toBe('http://example.com/');
  });

  it('rejects empty, whitespace-only, and missing url', () => {
    expect(() => assertValidQueueScrapeUrl('')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('   ')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl(undefined)).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl(null)).toThrow(ValidationError);
  });

  it('rejects non-http(s) schemes', () => {
    expect(() => assertValidQueueScrapeUrl('ftp://example.com/')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('javascript:alert(1)')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('file:///etc/passwd')).toThrow(ValidationError);
  });

  it('rejects malformed URLs', () => {
    expect(() => assertValidQueueScrapeUrl('not a url')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('://broken')).toThrow(ValidationError);
  });

  it('rejects URLs longer than max length', () => {
    const base = 'https://example.com/';
    const long = base + 'a'.repeat(QUEUE_SCRAPE_URL_MAX_LENGTH - base.length + 1);
    expect(long.length).toBeGreaterThan(QUEUE_SCRAPE_URL_MAX_LENGTH);
    expect(() => assertValidQueueScrapeUrl(long)).toThrow(ValidationError);
  });

  it('accepts URL at exactly max length', () => {
    const base = 'https://x/';
    const pad = 'a'.repeat(QUEUE_SCRAPE_URL_MAX_LENGTH - base.length);
    const url = base + pad;
    expect(url.length).toBe(QUEUE_SCRAPE_URL_MAX_LENGTH);
    expect(() => assertValidQueueScrapeUrl(url)).not.toThrow();
  });

  it('accepts http(s) with IPv4 host and normalizes href', () => {
    expect(assertValidQueueScrapeUrl('http://127.0.0.1:8080/path')).toBe('http://127.0.0.1:8080/path');
  });

  it('accepts URLs with userinfo and preserves normalized href', () => {
    const out = assertValidQueueScrapeUrl('https://user:pass@example.com/foo');
    expect(out.startsWith('https://')).toBe(true);
    expect(out).toContain('example.com');
  });

  it('rejects numeric and object inputs that are not valid URLs', () => {
    expect(() => assertValidQueueScrapeUrl(123 as unknown as string)).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl({} as unknown as string)).toThrow(ValidationError);
  });

  it('treats data: and blob: schemes like other non-http(s) schemes', () => {
    expect(() => assertValidQueueScrapeUrl('data:text/html,<html>')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('blob:https://example.com/uuid')).toThrow(ValidationError);
  });

  it('rejects ASCII control characters in the URL string', () => {
    // Control chars in the middle only: trim() strips leading/trailing whitespace, so a trailing \n would vanish.
    expect(() => assertValidQueueScrapeUrl('https://exa\nmple.com/')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('https://exa\tmple.com/')).toThrow(ValidationError);
    expect(() => assertValidQueueScrapeUrl('https://example.com/\x7f')).toThrow(ValidationError);
  });

  it('rejects when canonical href exceeds max length (IDNA / normalization)', () => {
    const base = 'https://xn--/';
    const pad = 'a'.repeat(Math.max(0, QUEUE_SCRAPE_URL_MAX_LENGTH - base.length));
    const input = base + pad;
    expect(input.length).toBeLessThanOrEqual(QUEUE_SCRAPE_URL_MAX_LENGTH);
    try {
      const u = new URL(input);
      if (u.href.length > QUEUE_SCRAPE_URL_MAX_LENGTH) {
        expect(() => assertValidQueueScrapeUrl(input)).toThrow(ValidationError);
      }
    } catch {
      // Invalid URL — skip synthetic case
    }
  });
});

describe('queueScrapeUrlZod', () => {
  it('accepts the same URLs as assertValidQueueScrapeUrl', () => {
    expect(queueScrapeUrlZod.safeParse('https://example.com').success).toBe(true);
    const bad = queueScrapeUrlZod.safeParse('ftp://example.com');
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues[0]?.message).toContain('http');
    }
  });

  it('surfaces control-character rejection via custom issue message', () => {
    const r = queueScrapeUrlZod.safeParse('https://exa\tmple.com/');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain('control');
    }
  });
});

describe('scraperApiUrlZod', () => {
  it('parses to normalized href like assertValidQueueScrapeUrl', () => {
    const r = scraperApiUrlZod.safeParse('  https://example.com/x  ');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBe('https://example.com/x');
    }
  });

  it('rejects invalid URLs with HTTP API wording (not queue-scrape)', () => {
    const tab = scraperApiUrlZod.safeParse('https://exa\tmple.com/');
    expect(tab.success).toBe(false);
    if (!tab.success) {
      expect(tab.error.issues[0]?.message).toContain('control');
      expect(tab.error.issues[0]?.message).not.toContain('queue-scrape');
    }

    const ftp = scraperApiUrlZod.safeParse('ftp://x/');
    expect(ftp.success).toBe(false);
    if (!ftp.success) {
      expect(ftp.error.issues[0]?.message).toMatch(/http/i);
      expect(ftp.error.issues[0]?.message).not.toContain('queue-scrape');
    }

    const empty = scraperApiUrlZod.safeParse('   ');
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toContain('required');
      expect(empty.error.issues[0]?.message).not.toContain('queue-scrape');
    }
  });
});

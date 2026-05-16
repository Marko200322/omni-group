import { z } from 'zod';
import { ValidationError } from '../../utils/errors';

/** Max length for queue-scrape URLs (aligned with common browser limits). */
export const QUEUE_SCRAPE_URL_MAX_LENGTH = 2048;

/**
 * ASCII control characters and DEL must not appear in the URL string (after trim).
 * Implemented without a control-regex literal (eslint no-control-regex).
 */
export function hasAsciiControl(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

type ScrapeUrlAudience = 'queue' | 'api';

const SCRAPE_URL_MESSAGES: Record<
  ScrapeUrlAudience,
  {
    empty: string;
    control: string;
    length: string;
    parse: string;
    scheme: string;
    hostname: string;
    lengthNormalized: string;
    zodFallback: string;
  }
> = {
  queue: {
    empty: 'scraper queue-scrape requires config.url',
    control: 'scraper queue-scrape url must not contain control characters',
    length: `scraper queue-scrape url must be at most ${QUEUE_SCRAPE_URL_MAX_LENGTH} characters`,
    parse: 'scraper queue-scrape requires a valid http(s) URL',
    scheme: 'scraper queue-scrape url must use http or https',
    hostname: 'scraper queue-scrape url must include a hostname',
    lengthNormalized: `scraper queue-scrape url must be at most ${QUEUE_SCRAPE_URL_MAX_LENGTH} characters after normalization`,
    zodFallback: 'Invalid queue-scrape URL',
  },
  api: {
    empty: 'scraper url is required',
    control: 'scraper url must not contain control characters',
    length: `scraper url must be at most ${QUEUE_SCRAPE_URL_MAX_LENGTH} characters`,
    parse: 'scraper requires a valid http(s) URL',
    scheme: 'scraper url must use http or https',
    hostname: 'scraper url must include a hostname',
    lengthNormalized: `scraper url must be at most ${QUEUE_SCRAPE_URL_MAX_LENGTH} characters after normalization`,
    zodFallback: 'Invalid scraper URL',
  },
};

function assertValidScrapeUrlForAudience(raw: unknown, audience: ScrapeUrlAudience): string {
  const m = SCRAPE_URL_MESSAGES[audience];
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    throw new ValidationError(m.empty);
  }
  if (hasAsciiControl(trimmed)) {
    throw new ValidationError(m.control);
  }
  if (trimmed.length > QUEUE_SCRAPE_URL_MAX_LENGTH) {
    throw new ValidationError(m.length);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(m.parse);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError(m.scheme);
  }

  if (!parsed.hostname) {
    throw new ValidationError(m.hostname);
  }

  if (parsed.href.length > QUEUE_SCRAPE_URL_MAX_LENGTH) {
    throw new ValidationError(m.lengthNormalized);
  }

  return parsed.href;
}

/**
 * Validates and normalizes a workflow queue-scrape URL: non-empty, max length, parseable, http/https only.
 */
export function assertValidQueueScrapeUrl(raw: unknown): string {
  return assertValidScrapeUrlForAudience(raw, 'queue');
}

function assertValidScraperApiUrl(raw: unknown): string {
  return assertValidScrapeUrlForAudience(raw, 'api');
}

/**
 * Zod field for queue-scrape `config.url` (http/https, length, same rules as {@link assertValidQueueScrapeUrl}).
 */
export const queueScrapeUrlZod = z.string().superRefine((val, ctx) => {
  try {
    assertValidQueueScrapeUrl(val);
  } catch (e) {
    const message = e instanceof ValidationError ? e.message : 'Invalid queue-scrape URL';
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

/**
 * Scraper HTTP API (`/scrape`, `/scrape/bulk`, `/preview`): same rules as queue-scrape;
 * parsed output is normalized `URL.href` (trim, default port, etc.).
 */
export const scraperApiUrlZod = z
  .string()
  .superRefine((val, ctx) => {
    try {
      assertValidScraperApiUrl(val);
    } catch (e) {
      const message =
        e instanceof ValidationError ? e.message : SCRAPE_URL_MESSAGES.api.zodFallback;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  })
  .transform((val) => assertValidScraperApiUrl(val));

/** Limits for custom regex selector map (SSRF-adjacent / ReDoS hygiene). */
export const MAX_SCRAPER_SELECTOR_KEYS = 30;
export const MAX_SCRAPER_SELECTOR_KEY_LEN = 120;
export const MAX_SCRAPER_SELECTOR_PATTERN_LEN = 500;
export const MAX_SCRAPER_SELECTORS_JSON_CHARS = 8192;

/**
 * Optional `selectors` map on scrape endpoints: bounded keys, pattern length, no control chars.
 */
export const scraperSelectorsOptionalZod = z
  .record(z.string())
  .optional()
  .superRefine((rec, ctx) => {
    if (rec === undefined) return;
    const keys = Object.keys(rec);
    if (keys.length > MAX_SCRAPER_SELECTOR_KEYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At most ${MAX_SCRAPER_SELECTOR_KEYS} selector keys allowed`,
      });
      return;
    }
    for (const k of keys) {
      if (k.length > MAX_SCRAPER_SELECTOR_KEY_LEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Selector key too long (max ${MAX_SCRAPER_SELECTOR_KEY_LEN})`,
          path: [k],
        });
        return;
      }
      if (hasAsciiControl(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selector key must not contain control characters',
          path: [k],
        });
        return;
      }
      const v = rec[k];
      if (typeof v !== 'string') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selector pattern must be a string',
          path: [k],
        });
        return;
      }
      if (v.length > MAX_SCRAPER_SELECTOR_PATTERN_LEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Selector pattern too long (max ${MAX_SCRAPER_SELECTOR_PATTERN_LEN})`,
          path: [k],
        });
        return;
      }
      if (hasAsciiControl(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selector pattern must not contain control characters',
          path: [k],
        });
        return;
      }
    }
    try {
      if (JSON.stringify(rec).length > MAX_SCRAPER_SELECTORS_JSON_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Selectors must be at most ${MAX_SCRAPER_SELECTORS_JSON_CHARS} characters when serialized`,
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selectors must be JSON-serializable',
      });
    }
  });

/** List scrape jobs — shared strict pagination. */
export { StrictPaginationQueryDto as ScraperJobsListQueryDto } from '../../api/dto/pagination-query.dto';

export const ScraperJobIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

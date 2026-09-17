/**
 * Security, proxy, env schema, and PII sanitization for the outreach engine.
 */
import { z } from 'zod';
import type { RawLead, SanitizedLead } from './types.js';
import { RawLeadSchema, SanitizedLeadSchema } from './types.js';

export const EnvSchema = z.object({
  TAVILY_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),

  MY_WEBSITE_API_URL: z.string().url().default('https://omnigrouptech.com'),
  ATINA_API_URL: z.string().url().default('https://api.omnigrouptech.com'),
  CONTEXT_DELIVERABLES_PATH: z.string().default('/api/v1/billing/deliverables'),
  CONTEXT_INDUSTRY_CATALOG_PATH: z
    .string()
    .default('/api/atina/billing/industry-catalog'),
  CONTEXT_CATEGORY_PRICING_PATH: z
    .string()
    .default('/api/atina/billing/category-pricing'),

  CHECKOUT_BASE_URL: z
    .string()
    .url()
    .default('https://omnigrouptech.com/pricing'),
  PUBLIC_SITE_URL: z.string().url().default('https://omnigrouptech.com'),

  OUTREACH_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),
  OUTREACH_MODE: z.enum(['draft', 'email', 'webhook']).default('draft'),
  DISPATCH_FROM_EMAIL: z.string().email().optional(),
  DISPATCH_WEBHOOK_URL: z.string().url().optional(),

  AGENT1_MODEL: z.string().default('gpt-4o-mini'),
  AGENT2_MODEL: z.string().default('gpt-4o'),

  HTTP_PROXY: z.string().optional(),
  HTTPS_PROXY: z.string().optional(),
  SOCKS_PROXY: z.string().optional(),
  PROXY_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),

  CRON_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(120).default(20),
  DELAY_MIN_SECONDS: z.coerce.number().int().min(60).default(240),
  DELAY_MAX_SECONDS: z.coerce.number().int().min(120).default(1080),

  AUDIT_DB_PATH: z.string().default('./data/outreach-audit.sqlite'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type SecurityEnv = z.infer<typeof EnvSchema>;

export function loadSecurityEnv(
  source: NodeJS.ProcessEnv = process.env,
): SecurityEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid outreach-engine env: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  const env = parsed.data;
  if (env.DELAY_MAX_SECONDS < env.DELAY_MIN_SECONDS) {
    throw new Error('DELAY_MAX_SECONDS must be >= DELAY_MIN_SECONDS');
  }
  if (env.OUTREACH_ENABLED && env.OUTREACH_MODE === 'email' && !env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY required when OUTREACH_MODE=email and OUTREACH_ENABLED=true');
  }
  if (
    env.OUTREACH_ENABLED &&
    env.OUTREACH_MODE === 'webhook' &&
    !env.DISPATCH_WEBHOOK_URL
  ) {
    throw new Error('DISPATCH_WEBHOOK_URL required when OUTREACH_MODE=webhook');
  }
  return env;
}

export type ProxyConfig = {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  socksProxy?: string;
};

export function resolveProxyConfig(env: SecurityEnv): ProxyConfig {
  return {
    enabled: env.PROXY_ENABLED,
    httpProxy: env.HTTP_PROXY,
    httpsProxy: env.HTTPS_PROXY,
    socksProxy: env.SOCKS_PROXY,
  };
}

/** Fetch init extras for undici/node-fetch style callers (document only — wire in n8n HTTP Proxy field). */
export function proxyHeadersNote(proxy: ProxyConfig): string {
  if (!proxy.enabled) return 'Proxy disabled — direct egress.';
  return `Proxy enabled. Configure n8n HTTP Request node proxy URL from HTTP_PROXY/HTTPS_PROXY/SOCKS_PROXY. Never log proxy credentials.`;
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi;

export function redactPii(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(IBAN_RE, '[REDACTED_IBAN]')
    .replace(CARD_RE, '[REDACTED_CARD]')
    .replace(PHONE_RE, '[REDACTED_PHONE]');
}

export function stripSecretsFromObject<T extends Record<string, unknown>>(
  obj: T,
): T {
  const blocked = /key|secret|token|password|authorization|cookie/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (blocked.test(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string') {
      out[k] = redactPii(v);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = stripSecretsFromObject(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function sanitizeLeadForLlm(raw: RawLead): SanitizedLead {
  const lead = RawLeadSchema.parse(raw);
  let urlHost: string | undefined;
  if (lead.url) {
    try {
      urlHost = new URL(lead.url).hostname;
    } catch {
      urlHost = undefined;
    }
  }
  const body = redactPii(lead.body).slice(0, 2500);
  const title = redactPii(lead.title).slice(0, 500);
  return SanitizedLeadSchema.parse({
    id: lead.id,
    source: lead.source,
    title,
    bodyExcerpt: body,
    urlHost,
    discoveredAt: lead.discoveredAt,
  });
}

/** Never allow LLM-invented payment hosts */
const BLOCKED_PAYMENT_HOST_FRAGMENTS = [
  'paypal.com',
  'stripe.com',
  'checkout.stripe.com',
  'buy.stripe.com',
  'paddle.com',
  'lemonsqueezy.com',
  'wise.com',
  'revolut.com',
];

export function assertSafeCheckoutUrl(
  url: string | null | undefined,
  checkoutBaseUrl: string,
  packageId: string | null | undefined,
): { ok: boolean; url: string | null; reason?: string } {
  if (!url) {
    if (!packageId) return { ok: true, url: null };
    const built = `${checkoutBaseUrl.replace(/\/$/, '')}?package=${encodeURIComponent(packageId)}`;
    return { ok: true, url: built };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, url: null, reason: 'checkout_url_unparseable' };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_PAYMENT_HOST_FRAGMENTS.some((f) => host.includes(f))) {
    return {
      ok: false,
      url: null,
      reason: 'checkout_url_must_come_from_platform_not_processor',
    };
  }
  const base = new URL(checkoutBaseUrl);
  if (parsed.origin !== base.origin) {
    return { ok: false, url: null, reason: 'checkout_url_wrong_origin' };
  }
  if (packageId) {
    const q = parsed.searchParams.get('package');
    if (q && q !== packageId) {
      return { ok: false, url: null, reason: 'checkout_package_mismatch' };
    }
  }
  return { ok: true, url: parsed.toString() };
}

export function randomDelaySeconds(minSec: number, maxSec: number): number {
  const lo = Math.min(minSec, maxSec);
  const hi = Math.max(minSec, maxSec);
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

export function buildContextUrls(env: SecurityEnv): {
  deliverablesUrl: string;
  industryCatalogUrl: string;
  categoryPricingUrl: string;
} {
  return {
    deliverablesUrl: new URL(
      env.CONTEXT_DELIVERABLES_PATH,
      env.ATINA_API_URL,
    ).toString(),
    industryCatalogUrl: new URL(
      env.CONTEXT_INDUSTRY_CATALOG_PATH,
      env.MY_WEBSITE_API_URL,
    ).toString(),
    categoryPricingUrl: new URL(
      env.CONTEXT_CATEGORY_PRICING_PATH,
      env.MY_WEBSITE_API_URL,
    ).toString(),
  };
}

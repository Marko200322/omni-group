const SECRET_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // Passwords / generic key=value first (before Stripe patterns rewrite the string).
  {
    re: /(password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*([^\s&;"']+)/gi,
    replacement: '$1=[REDACTED]',
  },
  {
    re: /("?(?:password|passwd|pwd|secret|api[_-]?key|token)"?\s*[:=]\s*")([^"]+)(")/gi,
    replacement: '$1[REDACTED]$3',
  },
  {
    re: /('(?:password|passwd|pwd|secret|api[_-]?key|token)'\s*[:=]\s*')([^']+)(')/gi,
    replacement: '$1[REDACTED]$3',
  },
  { re: /\bsk_(?:live|test)_[A-Za-z0-9]+/gi, replacement: '[REDACTED_STRIPE_SECRET]' },
  { re: /\bpk_(?:live|test)_[A-Za-z0-9]+/gi, replacement: '[REDACTED_STRIPE_PUBLISHABLE]' },
  { re: /\bwhsec_[A-Za-z0-9]+/gi, replacement: '[REDACTED_WEBHOOK_SECRET]' },
  { re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
];

function redactString(input: string): string {
  let out = input;
  for (const { re, replacement } of SECRET_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, replacement);
  }
  return out;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'secretkey',
  'apikey',
  'api_key',
  'token',
  'authorization',
  'bearer',
  'webhooksecret',
  'stripe_secret_key',
  'stripeSecretKey',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (SENSITIVE_KEYS.has(normalized) || SENSITIVE_KEYS.has(key)) return true;
  return /password|secret|token|apikey|authorization|webhook/i.test(key);
}

function redactValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactValue(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Strip secrets from strings or nested objects (sk_/pk_/whsec_/passwords/Bearer).
 */
export function redactSecrets<T>(input: T): T {
  if (typeof input === 'string') {
    return redactString(input) as T;
  }
  return redactValue(input) as T;
}

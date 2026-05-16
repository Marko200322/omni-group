import { z } from 'zod';

const FRAMEWORKS = ['gdpr', 'iso27001', 'soc2', 'internal'] as const;

/** Max serialized evidence JSON (DB / abuse guard). */
export const MAX_COMPLIANCE_EVIDENCE_JSON_CHARS = 32768;

/**
 * Express `req.query` values are strings or string[] (duplicate keys). Reject multi-value arrays,
 * trim whitespace, and treat empty strings as absent.
 */
function frameworkListQueryParam<T extends readonly [string, ...string[]]>(allowed: T) {
  return z.preprocess((val: unknown) => {
    if (val === undefined) return undefined;
    if (Array.isArray(val)) {
      if (val.length !== 1) return val;
      const inner = val[0];
      if (typeof inner !== 'string') return val;
      const t = inner.trim();
      return t === '' ? undefined : t;
    }
    if (typeof val === 'string') {
      const t = val.trim();
      return t === '' ? undefined : t;
    }
    return val;
  }, z.enum(allowed).optional());
}

/** Admin list — optional `framework` filter; only known keys allowed (strict). */
export const ComplianceListQueryDto = z
  .object({
    framework: frameworkListQueryParam(FRAMEWORKS),
  })
  .strict();

export const RecordComplianceDto = z
  .object({
    framework: z.enum(FRAMEWORKS).default('internal'),
    controlKey: z.string().trim().min(2).max(80),
    status: z.enum(['pass', 'warn', 'fail']).default('pass'),
    notes: z.string().trim().max(500).optional(),
    evidence: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((data, ctx) => {
    try {
      if (JSON.stringify(data.evidence).length > MAX_COMPLIANCE_EVIDENCE_JSON_CHARS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Evidence must be at most ${MAX_COMPLIANCE_EVIDENCE_JSON_CHARS} characters when serialized`,
          path: ['evidence'],
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Evidence must be JSON-serializable',
        path: ['evidence'],
      });
    }
  });

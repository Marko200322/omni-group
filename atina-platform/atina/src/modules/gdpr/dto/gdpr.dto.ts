import { z } from 'zod';

/** Max serialized JSON length for GDPR payloads (abuse / DB safety). */
export const MAX_GDPR_JSON_CHARS = 32768;

function refineSerializableRecordSize(
  record: Record<string, unknown>,
  path: 'payload' | 'response',
  ctx: z.RefinementCtx
): void {
  try {
    const s = JSON.stringify(record);
    if (s.length > MAX_GDPR_JSON_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must be at most ${MAX_GDPR_JSON_CHARS} characters when serialized`,
        path: [path],
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Must be JSON-serializable',
      path: [path],
    });
  }
}

/**
 * Express `req.query` values are strings or string[] (duplicate keys). Reject multi-value arrays,
 * trim whitespace, and treat empty strings as absent.
 */
function scopeQueryParam<T extends readonly [string, ...string[]]>(allowed: T) {
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

/** List current user's GDPR requests — only `scope=mine` is allowed when the param is present. */
export const GdprListMineQueryDto = z
  .object({
    scope: scopeQueryParam(['mine']),
  })
  .strict();

/** Admin list — only `scope=all` is allowed when the param is present. */
export const GdprListAllQueryDto = z
  .object({
    scope: scopeQueryParam(['all']),
  })
  .strict();

export const CreateGdprRequestDto = z
  .object({
    requestType: z.enum(['export', 'delete', 'rectify', 'restrict']),
    payload: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((data, ctx) => refineSerializableRecordSize(data.payload, 'payload', ctx));

export const ProcessGdprRequestDto = z
  .object({
    status: z.enum(['approved', 'rejected', 'completed']),
    response: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((data, ctx) => refineSerializableRecordSize(data.response, 'response', ctx));

export const GdprProcessIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

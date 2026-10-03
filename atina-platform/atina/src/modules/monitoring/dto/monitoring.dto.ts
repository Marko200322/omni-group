import { z } from 'zod';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

const queryLimit = z.preprocess(
  (v) => (v === undefined || v === '' ? 50 : v),
  z.coerce.number().int().min(1).max(200)
);

const optionalQueryString = z.preprocess((val: unknown): unknown => {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) {
    const first = val[0];
    if (first === undefined || first === null || String(first).trim() === '') return undefined;
    return String(first);
  }
  return String(val);
}, z.string().optional());

export const MonitoringListQueryDto = z
  .object({
    limit: queryLimit,
    status: optionalQueryString,
  })
  .strict();

export const MonitoringIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const EngineRunBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      /** Optional correlation id for tracing this probe suite. */
      correlationId: z.string().min(1).max(80).optional(),
    })
    .strict()
);

export const PatchIncidentBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      status: z.enum([
        'detected',
        'acknowledged',
        'investigating',
        'mitigating',
        'monitoring',
        'resolved',
        'closed',
      ]),
      resolution: z.string().max(4000).optional(),
      note: z.string().max(2000).optional(),
    })
    .strict()
);

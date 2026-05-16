import { z } from 'zod';

const defaultRunModeSnapshot = (v: unknown): unknown => {
  if (v === undefined || v === null) return { mode: 'snapshot' as const };
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  if (!('mode' in o) || o.mode === undefined || o.mode === null) {
    return { ...o, mode: 'snapshot' as const };
  }
  return v;
};

export const CreateTitanScoreDto = z
  .object({
    name: z.string().trim().min(2).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    weightProfile: z.enum(['balanced', 'ops', 'growth']).default('balanced'),
  })
  .strict();

const SnapshotRun = z
  .object({
    mode: z.literal('snapshot'),
    payload: z.record(z.unknown()).optional(),
  })
  .strict();

const TrendRun = z
  .object({
    mode: z.literal('trend'),
    points: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(128),
          value: z.number().finite(),
        })
      )
      .min(1)
      .max(100),
  })
  .strict();

const CompareRun = z
  .object({
    mode: z.literal('compare'),
    left: z.record(z.unknown()),
    right: z.record(z.unknown()),
  })
  .strict();

export const RunTitanScoreDto = z.preprocess(
  defaultRunModeSnapshot,
  z.discriminatedUnion('mode', [SnapshotRun, TrendRun, CompareRun])
);

export const TitanScoreRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const TitanScoreStatusDto = z.object({
  modes: z.tuple([z.literal('snapshot'), z.literal('trend'), z.literal('compare')]),
  scoreRange: z.object({ min: z.literal(0), max: z.literal(100) }),
  weightProfiles: z.array(z.enum(['balanced', 'ops', 'growth'])),
});

export type CreateTitanScoreDtoType = z.infer<typeof CreateTitanScoreDto>;
export type RunTitanScoreDtoType = z.infer<typeof RunTitanScoreDto>;
export type TitanScoreStatusDtoType = z.infer<typeof TitanScoreStatusDto>;

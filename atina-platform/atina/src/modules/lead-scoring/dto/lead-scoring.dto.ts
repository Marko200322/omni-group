import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateLeadScoringDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    modelPreset: z.enum(['standard', 'aggressive', 'conservative']).default('standard'),
  })
  .strict();

export const RunLeadScoringDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['score', 'rank', 'refresh']).default('score'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const LeadScoringRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const LeadScoringStatusDto = z.object({
  presets: z.array(z.enum(['standard', 'aggressive', 'conservative'])),
  defaultPreset: z.enum(['standard', 'aggressive', 'conservative']),
  scoreRange: z.object({ min: z.number(), max: z.number() }),
});

export type CreateLeadScoringDtoType = z.infer<typeof CreateLeadScoringDto>;
export type RunLeadScoringDtoType = z.infer<typeof RunLeadScoringDto>;
export type LeadScoringStatusDtoType = z.infer<typeof LeadScoringStatusDto>;

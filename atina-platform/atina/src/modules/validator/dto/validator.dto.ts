import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateValidatorDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    profile: z.enum(['strict', 'balanced', 'lenient']).default('balanced'),
  })
  .strict();

export const RunValidatorDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['validate', 'sanitize', 'enrich']).default('validate'),
      intensity: z.number().int().min(1).max(100).default(25),
      valueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const ValidatorRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const ValidatorStatusDto = z.object({
  modes: z.array(z.enum(['validate', 'sanitize', 'enrich'])),
  activeMode: z.enum(['validate', 'sanitize', 'enrich']),
  pipelineCapacity: z.object({
    maxItemsPerRun: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export type CreateValidatorDtoType = z.infer<typeof CreateValidatorDto>;
export type RunValidatorDtoType = z.infer<typeof RunValidatorDto>;
export type ValidatorStatusDtoType = z.infer<typeof ValidatorStatusDto>;

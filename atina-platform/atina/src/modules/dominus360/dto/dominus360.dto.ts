import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateDominusDto = z
  .object({
    name: z.string().min(3).max(255),
    stage: z.string().min(2).max(32).default('v1'),
    budgetAllocated: z.number().min(0).default(0),
  })
  .strict();

export const RunDominusDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['risk-scan', 'resource-allocation', 'forecast']).default('forecast'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

export const DominusRunParamsDto = z.object({
  id: z.string().min(1).max(128),
});

export type CreateDominusDtoType = z.infer<typeof CreateDominusDto>;
export type RunDominusDtoType = z.infer<typeof RunDominusDto>;

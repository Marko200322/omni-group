import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const TitanMasterIdParamDto = z
  .object({
    id: z.string().trim().min(1).max(64),
  })
  .strict();

export const CreateTitanMasterDto = z
  .object({
    name: z.string().trim().min(3).max(255),
    stage: z.string().trim().min(2).max(32).default('v1'),
    budgetAllocated: z.coerce.number().finite().min(0).default(0),
    objective: z.string().trim().min(3).max(500),
  })
  .strict();

export const RunTitanMasterDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['optimize', 'expand', 'stabilize']).default('optimize'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

export type TitanMasterIdParamDtoType = z.infer<typeof TitanMasterIdParamDto>;
export type CreateTitanMasterDtoType = z.infer<typeof CreateTitanMasterDto>;
export type RunTitanMasterDtoType = z.infer<typeof RunTitanMasterDto>;

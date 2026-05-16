import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateTitanixWorkspaceDto = z.object({
  name: z.string().trim().min(3).max(120),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
  executionProfile: z.enum(['balanced', 'aggressive', 'safe']).default('balanced'),
}).strict();

export const RunTitanixDto = z.preprocess(
  emptyBody,
  z
    .object({
      pipeline: z.enum(['content', 'campaign', 'ops']).default('ops'),
      jobs: z.number().int().min(1).max(200).default(10),
    })
    .strict()
);

export const TitanixRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
}).strict();

export type CreateTitanixWorkspaceDtoType = z.infer<typeof CreateTitanixWorkspaceDto>;
export type RunTitanixDtoType = z.infer<typeof RunTitanixDto>;

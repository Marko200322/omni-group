import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateTitanisWorkspaceDto = z.object({
  name: z.string().trim().min(3).max(120),
  outreachChannel: z.enum(['email', 'dm', 'mixed']).default('mixed'),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
}).strict();

export const RunTitanisDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['lead-hunt', 'follow-up', 'close']).default('lead-hunt'),
      targetCount: z.number().int().min(1).max(500).default(25),
    })
    .strict()
);

export const TitanisRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
}).strict();

export type CreateTitanisWorkspaceDtoType = z.infer<typeof CreateTitanisWorkspaceDto>;
export type RunTitanisDtoType = z.infer<typeof RunTitanisDto>;

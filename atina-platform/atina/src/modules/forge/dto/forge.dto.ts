import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateForgeDto = z.object({
  name: z.string().trim().min(3).max(120),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
  operatingMode: z.enum(['steady', 'aggressive', 'efficient']).default('steady'),
}).strict();

export const RunForgeDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['smelt', 'temper', 'deploy']).default('smelt'),
      intensity: z.number().int().min(1).max(100).default(25),
    })
    .strict()
);

export const ForgeRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
}).strict();

export const ForgeStatusDto = z.object({
  providers: z.array(z.enum(['oracle', 'aws', 'azure'])),
  nextProvider: z.enum(['oracle', 'aws', 'azure']),
  budgetRsd: z.object({
    initial: z.number(),
    remaining: z.number(),
    spent: z.number(),
  }),
  budgetGuard: z.object({
    minReserveRsd: z.number().min(0),
    hardStopMode: z.boolean(),
    availableToSpendRsd: z.number().min(0),
  }),
  recentEvents: z.array(
    z.object({
      id: z.string(),
      provider: z.enum(['oracle', 'aws', 'azure']),
      eventType: z.string(),
      costRsd: z.number(),
      createdAt: z.string(),
    })
  ),
});

export type CreateForgeDtoType = z.infer<typeof CreateForgeDto>;
export type RunForgeDtoType = z.infer<typeof RunForgeDto>;
export type ForgeStatusDtoType = z.infer<typeof ForgeStatusDto>;

import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateClientHunterDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    huntStrategy: z.enum(['broad', 'targeted', 'niche']).default('broad'),
  })
  .strict();

export const RunClientHunterDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['hunt', 'discover', 'nurture']).default('hunt'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
      verticalSlug: z
        .string()
        .trim()
        .min(2)
        .max(120)
        .regex(/^[a-z0-9-]+$/, 'Invalid vertical slug')
        .optional(),
      category: z.string().trim().max(80).optional(),
      verticalName: z.string().trim().max(200).optional(),
    })
    .strict()
);

export const ClientHunterRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const ClientHunterStatusDto = z.object({
  strategies: z.array(z.enum(['broad', 'targeted', 'niche'])),
  activeStrategy: z.enum(['broad', 'targeted', 'niche']),
  pipelineCapacity: z.object({
    maxLeadsPerRun: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export type CreateClientHunterDtoType = z.infer<typeof CreateClientHunterDto>;
export type RunClientHunterDtoType = z.infer<typeof RunClientHunterDto>;
export type ClientHunterStatusDtoType = z.infer<typeof ClientHunterStatusDto>;

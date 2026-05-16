import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateFollowUpDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    cadencePreset: z.enum(['steady', 'persistent', 'light']).default('steady'),
  })
  .strict();

export const RunFollowUpDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['schedule', 'escalate', 'digest']).default('schedule'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const FollowUpRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const FollowUpStatusDto = z.object({
  cadences: z.array(z.enum(['steady', 'persistent', 'light'])),
  activeCadence: z.enum(['steady', 'persistent', 'light']),
  pipelineCapacity: z.object({
    maxTouchpointsPerRun: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export type CreateFollowUpDtoType = z.infer<typeof CreateFollowUpDto>;
export type RunFollowUpDtoType = z.infer<typeof RunFollowUpDto>;
export type FollowUpStatusDtoType = z.infer<typeof FollowUpStatusDto>;

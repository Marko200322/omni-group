import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateFollowUpAutomationDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    followUpStrategy: z.enum(['aggressive', 'balanced', 'light']).default('balanced'),
  })
  .strict();

export const RunFollowUpAutomationDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['schedule', 'escalate', 'digest']).default('schedule'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const FollowUpAutomationRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const FollowUpAutomationStatusDto = z.object({
  strategies: z.array(z.enum(['aggressive', 'balanced', 'light'])),
  activeStrategy: z.enum(['aggressive', 'balanced', 'light']),
  pipelineCapacity: z.object({
    maxFollowUpsPerRun: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export type CreateFollowUpAutomationDtoType = z.infer<typeof CreateFollowUpAutomationDto>;
export type RunFollowUpAutomationDtoType = z.infer<typeof RunFollowUpAutomationDto>;
export type FollowUpAutomationStatusDtoType = z.infer<typeof FollowUpAutomationStatusDto>;

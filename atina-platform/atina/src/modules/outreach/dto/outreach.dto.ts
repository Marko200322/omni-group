import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateOutreachDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    channelFocus: z.enum(['email', 'sms', 'linkedin', 'multi']).default('email'),
  })
  .strict();

export const RunOutreachDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['send', 'sequence', 'ab-test']).default('send'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const OutreachRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const OutreachStatusDto = z.object({
  channels: z.array(z.enum(['email', 'sms', 'linkedin', 'push'])),
  dailyCap: z.number().int().min(0),
});

export type CreateOutreachDtoType = z.infer<typeof CreateOutreachDto>;
export type RunOutreachDtoType = z.infer<typeof RunOutreachDto>;
export type OutreachStatusDtoType = z.infer<typeof OutreachStatusDto>;

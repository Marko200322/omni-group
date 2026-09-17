import { z } from 'zod';

export const StartLiveCallSessionDto = z
  .object({
    agentId: z.string().trim().min(1).max(64).optional(),
    agentType: z.enum(['support', 'sales']).default('support'),
    platform: z.enum(['browser', 'zoom', 'google_meet']).default('browser'),
    liveProvider: z.enum(['auto', 'heygen', 'd-id', 'stub']).default('auto'),
    meetingRequestId: z.string().uuid().optional(),
    meetingUrl: z.string().url().optional(),
  })
  .strict();

export const LiveCallTurnDto = z
  .object({
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

export const LiveCallSessionParamsDto = z.object({ sessionId: z.string().uuid() }).strict();

export const BookLiveMeetingDto = z
  .object({
    topic: z.string().trim().min(3).max(255),
    description: z.string().trim().max(2000).optional(),
    provider: z.enum(['zoom', 'google_meet']).default('zoom'),
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(180).optional(),
    agentId: z.string().trim().min(1).max(64).optional(),
    agentType: z.enum(['support', 'sales']).default('support'),
    liveProvider: z.enum(['auto', 'heygen', 'd-id', 'stub']).default('auto'),
  })
  .strict();

export type StartLiveCallSessionDtoType = z.infer<typeof StartLiveCallSessionDto>;
export type LiveCallTurnDtoType = z.infer<typeof LiveCallTurnDto>;
export type BookLiveMeetingDtoType = z.infer<typeof BookLiveMeetingDto>;

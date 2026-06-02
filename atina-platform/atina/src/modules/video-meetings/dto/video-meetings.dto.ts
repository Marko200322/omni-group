import { z } from 'zod';

export const BookMeetingDto = z
  .object({
    topic: z.string().trim().min(3).max(255),
    description: z.string().trim().max(2000).optional(),
    provider: z.enum(['manual', 'zoom', 'google_meet']).default('manual'),
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(180).optional(),
  })
  .strict();

export const ConfirmMeetingDto = z
  .object({
    meetingUrl: z.string().url().optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .strict();

export const MeetingIdParamsDto = z.object({ id: z.string().uuid() }).strict();

export const AvatarSessionParamsDto = z.object({ sessionId: z.string().uuid() }).strict();

export const AvatarChatDto = z
  .object({
    sessionId: z.string().uuid(),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const StartAvatarSessionDto = z
  .object({
    agentId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type AvatarChatDtoType = z.infer<typeof AvatarChatDto>;
export type StartAvatarSessionDtoType = z.infer<typeof StartAvatarSessionDto>;

export type BookMeetingDtoType = z.infer<typeof BookMeetingDto>;
export type ConfirmMeetingDtoType = z.infer<typeof ConfirmMeetingDto>;

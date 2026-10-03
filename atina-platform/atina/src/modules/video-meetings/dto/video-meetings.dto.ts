import { z } from 'zod';

export const BookMeetingDto = z
  .object({
    topic: z.string().trim().min(3).max(255),
    description: z.string().trim().max(2000).optional(),
    provider: z.enum(['manual', 'zoom', 'google_meet']).default('manual'),
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(180).optional(),
    hostType: z.enum(['human', 'ai_avatar']).default('human'),
    agentId: z.string().trim().min(1).max(64).optional(),
    liveProvider: z.enum(['auto', 'heygen', 'd-id', 'stub']).default('auto'),
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
    pageContext: z
      .object({
        path: z.string().max(160).optional(),
        productId: z.string().max(80).optional(),
        industryCategory: z.string().max(40).optional(),
      })
      .strip()
      .optional(),
  })
  .strict();

export const StartAvatarSessionDto = z
  .object({
    agentId: z.string().trim().min(1).max(64).optional(),
    freshConsultation: z.boolean().optional(),
  })
  .strict();

export const AvatarFeedbackDto = z
  .object({
    sessionId: z.string().uuid(),
    messageId: z.string().uuid().optional(),
    rating: z.enum(['up', 'down']),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const AvatarHandoffDto = z
  .object({
    sessionId: z.string().uuid(),
  })
  .strict();

export type AvatarChatDtoType = z.infer<typeof AvatarChatDto>;
export type StartAvatarSessionDtoType = z.infer<typeof StartAvatarSessionDto>;
export type AvatarFeedbackDtoType = z.infer<typeof AvatarFeedbackDto>;
export type AvatarHandoffDtoType = z.infer<typeof AvatarHandoffDto>;

export type BookMeetingDtoType = z.infer<typeof BookMeetingDto>;
export type ConfirmMeetingDtoType = z.infer<typeof ConfirmMeetingDto>;

import { z } from 'zod';

export const NotificationsListQueryDto = z
  .object({
    page: z.preprocess(
      (v) => (v === undefined || v === '' ? 1 : v),
      z.coerce.number().int().min(1)
    ),
    limit: z.preprocess(
      (v) => (v === undefined || v === '' ? 20 : v),
      z.coerce.number().int().min(1).max(100)
    ),
    unreadOnly: z.enum(['true', 'false']).optional(),
  })
  .strict();

export const NotificationIdParamsDto = z.object({ id: z.string().uuid() }).strict();

export type NotificationsListQueryDtoType = z.infer<typeof NotificationsListQueryDto>;

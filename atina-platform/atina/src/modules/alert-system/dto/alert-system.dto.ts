import { z } from 'zod';

export const AlertSeverity = z.enum(['info', 'warning', 'error', 'critical']);
export const AlertStatus = z.enum(['open', 'acknowledged', 'resolved']);

export const CreateAlertDto = z
  .object({
    title: z.string().trim().min(2).max(255),
    message: z.string().trim().min(1).max(4000),
    severity: AlertSeverity.default('info'),
    category: z.string().trim().min(2).max(60).default('system'),
    sourceModule: z.string().trim().max(80).optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const AlertListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: AlertStatus.optional(),
    severity: AlertSeverity.optional(),
  })
  .strict();

export const AlertIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export type CreateAlertDtoType = z.infer<typeof CreateAlertDto>;
export type AlertListQueryType = z.infer<typeof AlertListQueryDto>;

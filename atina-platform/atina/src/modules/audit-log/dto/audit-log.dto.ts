import { z } from 'zod';

export const RecordAuditEventDto = z
  .object({
    eventType: z.string().min(2).max(80),
    entityType: z.string().min(2).max(80),
    entityId: z.string().min(1).max(120),
    severity: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    payload: z.record(z.unknown()).default({}),
  })
  .strict();

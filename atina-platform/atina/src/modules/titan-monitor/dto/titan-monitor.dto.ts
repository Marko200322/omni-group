import { z } from 'zod';

export const CreateMonitorProbeDto = z
  .object({
    note: z.string().min(2).max(255).default('manual probe'),
  })
  .strict();

export type CreateMonitorProbeDtoType = z.infer<typeof CreateMonitorProbeDto>;

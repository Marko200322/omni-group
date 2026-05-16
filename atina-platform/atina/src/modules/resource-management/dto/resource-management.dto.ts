import { z } from 'zod';

export const AllocateBudgetDto = z
  .object({
    systemSlug: z.string().min(2).max(64),
    amount: z.number().positive(),
    reason: z.string().min(3).max(255),
  })
  .strict();

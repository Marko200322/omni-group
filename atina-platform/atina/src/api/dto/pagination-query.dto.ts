import { z } from 'zod';

/**
 * Strict `page` / `limit` for GET list routes (Express query).
 * - `page`: invalid / missing → **1** via `.catch(1)`.
 * - `limit`: **≤ 100** must **fail** (400), not `.catch` clamp; default **20** when absent.
 */
export const StrictPaginationQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type StrictPaginationQuery = z.infer<typeof StrictPaginationQueryDto>;

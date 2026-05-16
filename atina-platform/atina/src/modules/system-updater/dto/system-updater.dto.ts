import { z } from 'zod';

/** GET /jobs — strict prazan query (vidi `api/dto/strict-empty-query.dto`). */
export { StrictEmptyQueryDto as ListUpdaterJobsQueryDto } from '../../../api/dto/strict-empty-query.dto';

export const QueueUpdateDto = z
  .object({
    targetVersion: z.string().min(2).max(40),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const FinishUpdateDto = z
  .object({
    status: z.enum(['completed', 'failed']),
    result: z.record(z.unknown()).default({}),
  })
  .strict();

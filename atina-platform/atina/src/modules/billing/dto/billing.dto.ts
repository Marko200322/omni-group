import { z } from 'zod';

export { StrictPaginationQueryDto as BillingInvoicesListQueryDto } from '../../../api/dto/pagination-query.dto';

export const BillingPlanSlugParamsDto = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid plan slug format'),
  })
  .strict();

export const BillingInvoiceIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const BillingLimitKeyParamsDto = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid limit key format'),
  })
  .strict();

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

export const BillingPaymentIdParamsDto = z
  .object({
    paymentId: z.string().uuid(),
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

export const BillingPlansQueryDto = z
  .object({
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/, 'Invalid industry category slug')
      .optional(),
  })
  .strict();

export const BillingQuoteCatalogQueryDto = z
  .object({
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    verticalSlug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    paymentProvider: z.enum(['manual', 'kriptoman', 'stripe', 'paypal']).optional(),
    tamEstimateUsd: z.coerce.number().finite().optional(),
    competitionScore: z.coerce.number().min(0).max(100).optional(),
    marketIntensity: z.coerce.number().min(0).max(100).optional(),
  })
  .strict();

export const BillingQuoteBodyDto = z
  .object({
    deliverableId: z.string().trim().min(2).max(64).regex(/^[a-z0-9_-]+$/),
    industryCategory: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    verticalSlug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    billingCycle: z.enum(['one_time', 'monthly', 'yearly']).optional(),
    paymentProvider: z.enum(['manual', 'kriptoman', 'stripe', 'paypal']).optional(),
    tamEstimateUsd: z.number().finite().optional(),
    competitionScore: z.number().min(0).max(100).optional(),
    marketIntensity: z.number().min(0).max(100).optional(),
  })
  .strict();

export const BillingFulfillmentJobsQueryDto = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  })
  .strict();

export const BillingFulfillmentRejectBodyDto = z
  .object({
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const BillingFulfillmentArtifactParamsDto = z
  .object({
    paymentId: z.string().uuid(),
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid artifact filename'),
  })
  .strict();

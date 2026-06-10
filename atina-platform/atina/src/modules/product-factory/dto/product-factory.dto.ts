import { z } from 'zod';

export const ProductFactoryLaneDto = z.enum(['client_order', 'internal_saas']);

export const CreateProductFactoryProjectDto = z
  .object({
    lane: ProductFactoryLaneDto,
    name: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug: lowercase, numbers, hyphens'),
    description: z.string().trim().max(4000).optional(),
    clientName: z.string().trim().min(2).max(200).optional(),
    clientEmail: z.string().trim().email().optional(),
    deliverableId: z.string().trim().max(64).optional(),
    marketHypothesis: z.string().trim().max(4000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.lane === 'client_order' && !data.clientName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'clientName is required for client_order lane',
        path: ['clientName'],
      });
    }
    if (data.lane === 'internal_saas' && !data.marketHypothesis?.trim() && !data.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'marketHypothesis or description required for internal_saas',
        path: ['marketHypothesis'],
      });
    }
  });

export const ProductFactoryProjectIdParamsDto = z.object({
  id: z.string().uuid(),
});

export const ProductFactoryListQueryDto = z.object({
  lane: ProductFactoryLaneDto.optional(),
  status: z.string().trim().max(32).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductFactoryProjectDtoType = z.infer<typeof CreateProductFactoryProjectDto>;
export type ProductFactoryListQueryDtoType = z.infer<typeof ProductFactoryListQueryDto>;

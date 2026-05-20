import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreatePackagePricingDto = z
  .object({
    name: z.string().trim().min(3).max(255),
    budgetAllocated: z.number().finite().min(0).default(0),
    basePrice: z.number().finite().min(0).default(99),
  })
  .strict();

export const RunPackagePricingDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['list-tiers', 'adjust-price', 'bundle']).default('list-tiers'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

export const PackagePricingRunParamsDto = z
  .object({
    id: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export type CreatePackagePricingDtoType = z.infer<typeof CreatePackagePricingDto>;
export type RunPackagePricingDtoType = z.infer<typeof RunPackagePricingDto>;

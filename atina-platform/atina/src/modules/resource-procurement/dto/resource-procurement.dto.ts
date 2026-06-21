import { z } from 'zod';

export const ResourceCheckoutDto = z
  .object({
    items: z
      .array(
        z
          .object({
            sku: z.string().min(1).max(60),
            qty: z.number().int().min(1).max(10).default(1),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict();

export const ResourceOrderIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const ResourceAutoToggleDto = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

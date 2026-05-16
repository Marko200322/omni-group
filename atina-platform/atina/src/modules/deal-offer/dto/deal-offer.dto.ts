import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const DealOfferModeSchema = z.enum(['draft', 'negotiate', 'close']);

export const CreateDealOfferDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    mode: DealOfferModeSchema.default('draft'),
  })
  .strict();

export const RunDealOfferDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: DealOfferModeSchema.default('draft'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
    })
    .strict()
);

export const DealOfferRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const DealOfferStatusDto = z.object({
  modes: z.array(DealOfferModeSchema),
  activeMode: DealOfferModeSchema,
  pipeline: z.object({
    maxConcurrentOffers: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export type CreateDealOfferDtoType = z.infer<typeof CreateDealOfferDto>;
export type RunDealOfferDtoType = z.infer<typeof RunDealOfferDto>;
export type DealOfferStatusDtoType = z.infer<typeof DealOfferStatusDto>;

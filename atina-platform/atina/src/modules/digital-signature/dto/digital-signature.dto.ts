import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateDigitalSignatureDto = z
  .object({
    name: z.string().trim().min(3).max(255),
    budgetAllocated: z.number().finite().min(0).default(0),
  })
  .strict();

export const RunDigitalSignatureDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['request', 'remind', 'verify']).default('request'),
      input: z.record(z.unknown()).default({}),
    })
    .strict()
);

export const DigitalSignatureRunParamsDto = z
  .object({
    id: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export type CreateDigitalSignatureDtoType = z.infer<typeof CreateDigitalSignatureDto>;
export type RunDigitalSignatureDtoType = z.infer<typeof RunDigitalSignatureDto>;

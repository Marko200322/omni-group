import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateProxyRotationDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    poolSize: z.number().int().min(1).max(10_000).default(10),
  })
  .strict();

export const RunProxyRotationDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['rotate', 'health', 'register-pool']).default('rotate'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().max(1_000_000_000_000).optional(),
    })
    .strict()
);

export const ProxyRotationRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const ProxyRotationStatusDto = z.object({
  poolPolicy: z.enum(['round-robin', 'weighted', 'sticky']),
  activeProxies: z.number().int().min(0),
  lastRotationAt: z.string().nullable(),
});

export type CreateProxyRotationDtoType = z.infer<typeof CreateProxyRotationDto>;
export type RunProxyRotationDtoType = z.infer<typeof RunProxyRotationDto>;
export type ProxyRotationStatusDtoType = z.infer<typeof ProxyRotationStatusDto>;

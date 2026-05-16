import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateAtinaSystemDto = z.object({
  name: z.string().trim().min(3).max(120),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
  operatingMode: z.enum(['balanced', 'growth', 'efficiency']).default('balanced'),
}).strict();

export const RunAtinaSystemDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['sync', 'optimize', 'execute']).default('sync'),
      intensity: z.number().int().min(1).max(100).default(25),
    })
    .strict()
);

export const AtinaSystemRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
}).strict();

/** Non-secret readiness slice for CEO checklist §G.4 (prod `.env`). */
export const ProdEnvReadinessDto = z.object({
  nodeEnv: z.string(),
  isProduction: z.boolean(),
  dbSsl: z.boolean(),
  jwtSecretUsesDocumentedPlaceholder: z.boolean(),
  jwtRefreshSecretUsesDocumentedPlaceholder: z.boolean(),
  dbPasswordUsesDocumentedPlaceholder: z.boolean(),
  adminPasswordUsesDocumentedPlaceholder: z.boolean(),
  smtpEnabled: z.boolean(),
  smtpHasCredentials: z.boolean(),
});

export const AtinaSystemStatusDto = z.object({
  providers: z.array(z.enum(['core', 'cloud', 'partner'])),
  nextProvider: z.enum(['core', 'cloud', 'partner']),
  capacity: z.object({
    total: z.number().int().min(0),
    available: z.number().int().min(0),
  }),
  recentEvents: z.array(
    z.object({
      id: z.string(),
      eventType: z.string(),
      createdAt: z.string(),
    })
  ),
  prodEnvReadiness: ProdEnvReadinessDto,
});

export type CreateAtinaSystemDtoType = z.infer<typeof CreateAtinaSystemDto>;
export type RunAtinaSystemDtoType = z.infer<typeof RunAtinaSystemDto>;
export type ProdEnvReadinessDtoType = z.infer<typeof ProdEnvReadinessDto>;
export type AtinaSystemStatusDtoType = z.infer<typeof AtinaSystemStatusDto>;

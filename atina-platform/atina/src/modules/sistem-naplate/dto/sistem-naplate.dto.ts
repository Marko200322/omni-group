import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

/** N3-E2: Workflow-chain template actions map to internal billing simulation modes. */
const SISTEM_NAPLATE_WORKFLOW_MODE_ALIASES = {
  'billing-cycle': 'reconcile',
  'risk-balance': 'invoice',
  'settlement-cycle': 'settlement',
  'outage-balance': 'reconcile',
  'payment-balance': 'invoice',
  'governance-reconcile': 'reconcile',
} as const satisfies Record<string, 'reconcile' | 'invoice' | 'settlement'>;

const RunSistemNaplateModeInput = z.union([
  z.enum(['reconcile', 'invoice', 'settlement']),
  z.enum([
    'billing-cycle',
    'risk-balance',
    'settlement-cycle',
    'outage-balance',
    'payment-balance',
    'governance-reconcile',
  ]),
]);

export const CreateSistemNaplateWorkspaceDto = z.object({
  name: z.string().trim().min(3).max(120),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
  billingCadence: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
}).strict();

export const RunSistemNaplateDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: RunSistemNaplateModeInput.default('reconcile').transform((m) => {
        const mapped = SISTEM_NAPLATE_WORKFLOW_MODE_ALIASES[m as keyof typeof SISTEM_NAPLATE_WORKFLOW_MODE_ALIASES];
        return (mapped ?? m) as 'reconcile' | 'invoice' | 'settlement';
      }),
      batchSize: z.number().int().min(1).max(500).default(50),
    })
    .strict()
);

export const SistemNaplateRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
}).strict();

export type CreateSistemNaplateWorkspaceDtoType = z.infer<typeof CreateSistemNaplateWorkspaceDto>;
export type RunSistemNaplateDtoType = z.infer<typeof RunSistemNaplateDto>;

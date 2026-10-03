import { z } from 'zod';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

const queryLimit = z.preprocess(
  (v) => (v === undefined || v === '' ? 50 : v),
  z.coerce.number().int().min(1).max(200)
);

const optionalQueryString = z.preprocess((val: unknown): unknown => {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) {
    const first = val[0];
    if (first === undefined || first === null || String(first).trim() === '') return undefined;
    return String(first);
  }
  return String(val);
}, z.string().optional());

export const ReinvestmentIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const ReinvestmentListQueryDto = z
  .object({
    limit: queryLimit,
    status: optionalQueryString,
  })
  .strict();

export const ReinvestmentAuditQueryDto = z
  .object({
    limit: queryLimit,
  })
  .strict();

export const ProposeTransactionBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      idempotencyKey: z.string().min(8).max(120),
      sourceAccountCode: z.enum(['revenue', 'system', 'marketing', 'profit_reserve']),
      destinationAccountCode: z.enum(['revenue', 'system', 'marketing', 'profit_reserve']),
      amountCents: z.number().int().positive(),
      currency: z.string().min(3).max(8).default('EUR'),
      purpose: z.string().min(2).max(80),
      opportunityId: z.string().uuid().optional(),
      investmentId: z.string().uuid().optional(),
      explanation: z.string().max(2000).optional(),
      metadata: z.record(z.unknown()).optional(),
      /** Caller may force dry-run; policy dry_run / kill_switch always win. */
      dryRun: z.boolean().optional(),
    })
    .strict()
);

export const DecideApprovalBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      decision: z.enum(['approved', 'rejected', 'modified']),
      note: z.string().max(2000).optional(),
      modifiedAmountCents: z.number().int().positive().optional(),
    })
    .strict()
);

export const PatchActivePolicyBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      dryRun: z.boolean().optional(),
      killSwitch: z.boolean().optional(),
      autonomyLevel: z.number().int().min(0).max(5).optional(),
      operatingMode: z
        .enum(['growth', 'normal', 'conservation', 'capital_preservation', 'emergency'])
        .optional(),
      maxSingleTxCents: z.number().int().nonnegative().optional(),
      maxDailySpendCents: z.number().int().nonnegative().optional(),
      maxWeeklySpendCents: z.number().int().nonnegative().optional(),
      maxMonthlySpendCents: z.number().int().nonnegative().optional(),
      approvalThresholdCents: z.number().int().nonnegative().optional(),
      mandatoryApprovalCents: z.number().int().nonnegative().optional(),
      minReserveCents: z.number().int().nonnegative().optional(),
      targetReserveCents: z.number().int().nonnegative().optional(),
      minRunwayMonths: z.number().positive().max(120).optional(),
      allowMarketingReallocation: z.boolean().optional(),
    })
    .strict()
    .refine(
      (v) => Object.keys(v).length > 0,
      { message: 'At least one policy setting is required' }
    )
);

export const ScenarioBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      startingCashCents: z.number().int().nonnegative().optional(),
      startingReserveCents: z.number().int().nonnegative().optional(),
      reserveFloorCents: z.number().int().nonnegative().optional(),
      baseMonthlyRevenueCents: z.number().int().nonnegative().optional(),
      baseMonthlyExpenseCents: z.number().int().nonnegative().optional(),
      shockMonth: z.number().int().min(1).max(12).optional(),
      unexpectedCostCents: z.number().int().nonnegative().optional(),
      revenueDropMonth: z.number().int().min(1).max(12).optional(),
      revenueDropBps: z.number().int().min(0).max(20_000).optional(),
      label: z.string().max(80).optional(),
    })
    .strict()
);

export const EngineRunBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      dryRun: z.boolean().default(true),
      createOpportunities: z.boolean().default(true),
    })
    .strict()
);

export const EngineDryRunYearBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      startingCashCents: z.number().int().nonnegative().optional(),
      startingReserveCents: z.number().int().nonnegative().optional(),
      reserveFloorCents: z.number().int().nonnegative().optional(),
      baseMonthlyRevenueCents: z.number().int().nonnegative().optional(),
      baseMonthlyExpenseCents: z.number().int().nonnegative().optional(),
    })
    .strict()
);

export type ProposeTransactionBody = z.infer<typeof ProposeTransactionBodyDto>;
export type DecideApprovalBody = z.infer<typeof DecideApprovalBodyDto>;
export type PatchActivePolicyBody = z.infer<typeof PatchActivePolicyBodyDto>;
export type ScenarioBody = z.infer<typeof ScenarioBodyDto>;
export type EngineRunBody = z.infer<typeof EngineRunBodyDto>;
export type EngineDryRunYearBody = z.infer<typeof EngineDryRunYearBodyDto>;
export type ReinvestmentListQuery = z.infer<typeof ReinvestmentListQueryDto>;

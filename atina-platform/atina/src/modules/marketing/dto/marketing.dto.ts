import { z } from 'zod';

export const MarketingListQueryDto = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  })
  .strict();

export const SpendIngestBodyDto = z
  .object({
    channelCode: z.string().min(1).max(40),
    amountCents: z.number().int().min(0),
    spentOn: z.string().max(32).optional(),
    impressions: z.number().int().min(0).optional(),
    clicks: z.number().int().min(0).optional(),
    idempotencyKey: z.string().min(1).max(160),
    csvText: z.string().max(500_000).optional(),
  })
  .strict();

export const WhatIfBodyDto = z
  .object({
    spendMultiplier: z.number().min(0).max(100).optional(),
    leadMultiplier: z.number().min(0).max(100).optional(),
    customerMultiplier: z.number().min(0).max(100).optional(),
    cacIncreasePct: z.number().min(0).max(500).optional(),
    conversionFallPct: z.number().min(0).max(100).optional(),
  })
  .strict();

export const EngineRunBodyDto = z.object({}).strict();

export const OmiQuestionQueryDto = z
  .object({
    q: z.string().min(1).max(500),
  })
  .strict();

export const CreateExperimentBodyDto = z
  .object({
    hypothesis: z.string().min(3).max(2000),
    channelCode: z.string().max(40).optional(),
    budgetCents: z.number().int().min(0).optional(),
    kpi: z.string().max(80).optional(),
    minSample: z.number().int().min(1).max(100000).optional(),
    successCriteria: z.string().max(2000).optional(),
    failureCriteria: z.string().max(2000).optional(),
  })
  .strict();

export const AttributeContactBodyDto = z
  .object({
    contactId: z.string().uuid(),
    paymentId: z.string().uuid().optional(),
    model: z.enum(['first_touch', 'last_touch', 'linear']).optional(),
  })
  .strict();

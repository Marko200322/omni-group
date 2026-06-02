import { z } from 'zod';

export const ScalingEvaluateDto = z
  .object({
    targetUtilizationPct: z.number().min(40).max(95).default(75),
    workloadKey: z.string().trim().min(2).max(120).optional(),
  })
  .strict();

export const ScalingRegisterNodeDto = z
  .object({
    nodeName: z.string().min(2).max(120),
    zone: z.string().min(2).max(60),
    capacityScore: z.number().min(1).max(1000).default(100),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export type ScalingEvaluateDtoType = z.infer<typeof ScalingEvaluateDto>;
export type ScalingRegisterNodeDtoType = z.infer<typeof ScalingRegisterNodeDto>;

import { z } from 'zod';

export const RegisterNodeDto = z
  .object({
    nodeName: z.string().min(2).max(120),
    zone: z.string().min(2).max(60),
    capacityScore: z.number().min(1).max(1000).default(100),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const DispatchDto = z
  .object({
    workloadKey: z.string().min(2).max(120),
  })
  .strict();

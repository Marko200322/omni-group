import { z } from 'zod';

export const SetPhaseDto = z
  .object({
    phase: z.enum(['v1', 'v2', 'v3', 'v4', 'v5', 'v6']),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type SetPhaseDtoType = z.infer<typeof SetPhaseDto>;

export const PdfLegalSignoffDto = z
  .object({
    trackerVersion: z.string().min(3).max(200),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export type PdfLegalSignoffDtoType = z.infer<typeof PdfLegalSignoffDto>;

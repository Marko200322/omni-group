import { z } from 'zod';

export const RunProblemSearchDto = z.object({
  sourceId: z.string().min(1).max(64),
  query: z.string().min(3).max(4000),
  industryCategory: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type RunProblemSearchDtoType = z.infer<typeof RunProblemSearchDto>;

export const ListProblemSignalsQueryDto = z.object({
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  industryCategory: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListProblemSignalsQueryDtoType = z.infer<typeof ListProblemSignalsQueryDto>;

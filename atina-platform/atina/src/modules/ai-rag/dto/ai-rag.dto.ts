import { z } from 'zod';

export const IngestRagDto = z.object({
  sourceId: z.string().min(1).max(255),
  text: z.string().min(1).max(500_000),
  chunkSize: z.number().int().min(200).max(8000).optional().default(1500),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const SearchRagQueryDto = z.object({
  q: z.string().min(1).max(500),
  sourceId: z.string().max(255).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  enrich: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type IngestRagDtoType = z.infer<typeof IngestRagDto>;
export type SearchRagQueryDtoType = z.infer<typeof SearchRagQueryDto>;

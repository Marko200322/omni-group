import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateOmniTubeDto = z.object({
  name: z.string().trim().min(2).max(255),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'multiplatform']).default('youtube'),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
}).strict();

export const RunOmniTubeDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['idea', 'production', 'publish', 'optimize']).default('publish'),
    })
    .strict()
);

export const OmniTubeRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid channel id format'),
}).strict();

export type CreateOmniTubeDtoType = z.infer<typeof CreateOmniTubeDto>;
export type RunOmniTubeDtoType = z.infer<typeof RunOmniTubeDto>;

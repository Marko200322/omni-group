import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateOmniGameDto = z.object({
  name: z.string().trim().min(2).max(255),
  genre: z.string().trim().min(2).max(64),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
}).strict();

export const RunOmniGameDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['trend-scan', 'prototype', 'validate', 'publish']).default('prototype'),
    })
    .strict()
);

export const OmniGameRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid project id format'),
}).strict();

export type CreateOmniGameDtoType = z.infer<typeof CreateOmniGameDto>;
export type RunOmniGameDtoType = z.infer<typeof RunOmniGameDto>;

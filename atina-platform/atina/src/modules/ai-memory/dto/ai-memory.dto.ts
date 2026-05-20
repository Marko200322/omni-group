import { z } from 'zod';

export const RememberDto = z
  .object({
    key: z.string().min(2).max(100),
    value: z.record(z.unknown()),
    namespace: z.string().min(2).max(50).default('global'),
  })
  .strict();

export const RecallQueryDto = z
  .object({
    namespace: z.preprocess(
      (v) => (v === undefined || v === '' ? 'global' : v),
      z.string().trim().min(2).max(50)
    ),
    key: z.preprocess(
      (v) => (v === undefined || v === '' ? undefined : v),
      z.string().trim().max(100).optional()
    ),
  })
  .strict();

export type RememberDtoType = z.infer<typeof RememberDto>;
export type RecallQueryDtoType = z.infer<typeof RecallQueryDto>;

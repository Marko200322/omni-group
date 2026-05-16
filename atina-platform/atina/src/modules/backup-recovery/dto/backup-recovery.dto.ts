import { z } from 'zod';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const ListBackupsQueryDto = z
  .object({
    limit: z.preprocess(
      (v) => (v === undefined || v === '' ? 50 : v),
      z.coerce.number().int().min(1).max(100)
    ),
  })
  .strict();

export const CreateBackupDto = z.preprocess(
  bodyToObject,
  z
    .object({
      snapshotType: z.enum(['manual', 'scheduled']).default('manual'),
      metadata: z.record(z.unknown()).default({}),
    })
    .strict()
);

export const RestoreBackupDto = z
  .object({
    snapshotId: z.string().uuid(),
    reason: z.string().min(3).max(255),
  })
  .strict();

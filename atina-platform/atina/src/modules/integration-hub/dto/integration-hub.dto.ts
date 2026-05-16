import { z } from 'zod';

export const CreateIntegrationDto = z
  .object({
    providerSlug: z.string().trim().min(2).max(50),
    displayName: z.string().trim().min(2).max(255),
    credentials: z.record(z.unknown()).default({}),
    config: z.record(z.unknown()).default({}),
  })
  .strict();

export const SyncIntegrationDto = z
  .object({
    integrationId: z.string().trim().uuid(),
  })
  .strict();

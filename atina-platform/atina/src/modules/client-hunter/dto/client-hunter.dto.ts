import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CreateClientHunterDto = z
  .object({
    name: z.string().trim().min(3).max(120),
    budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
    huntStrategy: z.enum(['broad', 'targeted', 'niche']).default('broad'),
  })
  .strict();

export const RunClientHunterDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: z.enum(['hunt', 'discover', 'nurture']).default('hunt'),
      intensity: z.number().int().min(1).max(100).default(25),
      revenueEstimate: z.number().finite().positive().optional(),
      verticalSlug: z
        .string()
        .trim()
        .min(2)
        .max(120)
        .regex(/^[a-z0-9-]+$/, 'Invalid vertical slug')
        .optional(),
      category: z.string().trim().max(80).optional(),
      verticalName: z.string().trim().max(200).optional(),
      /** ISO region filter: DE, US, GLOBAL, … */
      region: z.string().trim().max(8).optional(),
      /** Outreach locale: de, en, fr, … */
      locale: z.string().trim().max(10).optional(),
      /** Job board slugs from catalog; omit = top N by priority */
      platforms: z.array(z.string().trim().min(2).max(80)).max(30).optional(),
      maxPlatforms: z.number().int().min(1).max(30).optional(),
    })
    .strict()
);

export const ClientHunterRunParamsDto = z
  .object({
    id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workspace id format'),
  })
  .strict();

export const ClientHunterStatusDto = z.object({
  strategies: z.array(z.enum(['broad', 'targeted', 'niche'])),
  activeStrategy: z.enum(['broad', 'targeted', 'niche']),
  pipelineCapacity: z.object({
    maxLeadsPerRun: z.number().int().min(0),
    cooldownSeconds: z.number().int().min(0),
  }),
});

export const RunHuntingPipelineDto = z.preprocess(
  emptyBody,
  z
    .object({
      verticalSlug: z
        .string()
        .trim()
        .min(2)
        .max(120)
        .regex(/^[a-z0-9-]+$/)
        .default('marketing'),
      category: z.string().trim().max(80).optional(),
      verticalName: z.string().trim().max(200).optional(),
      intensity: z.number().int().min(1).max(100).default(60),
      templateKey: z.enum(['nurture-loop', 'client-acquisition-pipeline', 'lead-proxy-acquisition-pipeline']).default('nurture-loop'),
      processOutbound: z.boolean().default(true),
      force: z.boolean().default(false),
    })
    .strict()
);

export type RunHuntingPipelineDtoType = z.infer<typeof RunHuntingPipelineDto>;
export type CreateClientHunterDtoType = z.infer<typeof CreateClientHunterDto>;
export type RunClientHunterDtoType = z.infer<typeof RunClientHunterDto>;
export type ClientHunterStatusDtoType = z.infer<typeof ClientHunterStatusDto>;

/** Preview German job-intercept outreach (Gemini surgical copy). */
export const GermanJobPostingPreviewDto = z
  .object({
    jobPostingText: z.string().trim().min(50).max(8000),
    companyName: z.string().trim().max(200).optional(),
    city: z.string().trim().max(120).optional(),
    roleTitle: z.string().trim().max(200).optional(),
    salaryGrossMonthlyEur: z.number().finite().min(800).max(25000).optional(),
    atinaPriceRatio: z.number().finite().min(0.12).max(0.35).optional(),
    locale: z.string().trim().max(10).optional(),
    senderName: z.string().trim().max(120).optional(),
  })
  .strict();

export type GermanJobPostingPreviewDtoType = z.infer<typeof GermanJobPostingPreviewDto>;

export const ClientHunterCatalogQueryDto = z
  .object({
    region: z.string().trim().max(8).optional(),
    locale: z.string().trim().max(10).optional(),
    kind: z.string().trim().max(40).optional(),
  })
  .strict();

export const HotClientsListQueryDto = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    minHeat: z.coerce.number().int().min(0).max(100).optional(),
  })
  .strict();

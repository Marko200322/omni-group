import { z } from 'zod';

export const VerticalSlugParamDto = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Invalid vertical slug'),
});

export const ListVerticalsQueryDto = z.object({
  category: z.string().trim().max(80).optional(),
  status: z
    .enum(['seed', 'researching', 'ready', 'deployed', 'active', 'paused'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const ResearchVerticalDto = z.object({
  intensity: z.number().int().min(1).max(100).default(50),
  seedUrl: z.string().url().optional(),
});

export const GenerateVerticalDto = z.object({
  includePage: z.boolean().default(true),
  includeWorkflow: z.boolean().default(true),
});

export const DeployVerticalDto = z.object({
  gitCommit: z.boolean().default(true),
  triggerCi: z.boolean().default(true),
  notes: z.string().trim().max(500).optional(),
});

export const TickAutonomyDto = z.object({
  maxVerticals: z.number().int().min(1).max(10).default(3),
  runDeploy: z.boolean().optional(),
});

export const FeedbackSyncDto = z.object({
  lookbackDays: z.number().int().min(1).max(365).default(30),
});

export type VerticalSlugParamDtoType = z.infer<typeof VerticalSlugParamDto>;
export type ListVerticalsQueryDtoType = z.infer<typeof ListVerticalsQueryDto>;
export type ResearchVerticalDtoType = z.infer<typeof ResearchVerticalDto>;
export type GenerateVerticalDtoType = z.infer<typeof GenerateVerticalDto>;
export type DeployVerticalDtoType = z.infer<typeof DeployVerticalDto>;
export type TickAutonomyDtoType = z.infer<typeof TickAutonomyDto>;
export type FeedbackSyncDtoType = z.infer<typeof FeedbackSyncDto>;

export type VerticalStatus =
  | 'seed'
  | 'researching'
  | 'ready'
  | 'deployed'
  | 'active'
  | 'paused';

export type AutonomyCycleStep = {
  step: string;
  status: 'ok' | 'skipped' | 'failed';
  detail?: Record<string, unknown>;
};

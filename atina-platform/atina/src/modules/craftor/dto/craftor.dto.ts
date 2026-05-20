import { z } from 'zod';
import {
  ANTI_DETECTION_LEVELS,
  CRAFTOR_LEGACY_MODES,
  CRAFTOR_NICHES,
  CRAFTOR_PLATFORMS,
  CRAFTOR_RUN_MODES,
  CRAFTOR_V7_MODES,
} from '../craftor.constants';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const CraftorNicheSchema = z.enum(CRAFTOR_NICHES);
export const CraftorPlatformSchema = z.enum(CRAFTOR_PLATFORMS);
export const CraftorRunModeSchema = z.enum(CRAFTOR_RUN_MODES);
export const CraftorV7ModeSchema = z.enum(CRAFTOR_V7_MODES);
export const CraftorLegacyModeSchema = z.enum(CRAFTOR_LEGACY_MODES);
export const AntiDetectionLevelSchema = z.enum(ANTI_DETECTION_LEVELS);

export const CreateCraftorDto = z
  .object({
    name: z.string().min(3).max(255),
    budgetAllocated: z.number().min(0).default(0),
    leadTarget: z.number().min(1).max(100000).default(100),
    niche: CraftorNicheSchema.default('developer'),
    platforms: z.array(CraftorPlatformSchema).min(1).max(4).default(['upwork']),
    antiDetectionLevel: AntiDetectionLevelSchema.default('medium'),
  })
  .strict();

export const RunCraftorDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: CraftorRunModeSchema.default('hunting'),
      input: z.record(z.unknown()).default({}),
      platform: CraftorPlatformSchema.optional(),
      agent: z.enum(['proposal', 'negotiation', 'ranking', 'analytics', 'outreach', 'memory']).optional(),
    })
    .strict()
);

export const CraftorRunParamsDto = z
  .object({
    id: z.string().min(1).max(128),
  })
  .strict();

export type CreateCraftorDtoType = z.infer<typeof CreateCraftorDto>;
export type RunCraftorDtoType = z.infer<typeof RunCraftorDto>;
export type CraftorRunModeType = z.infer<typeof CraftorRunModeSchema>;

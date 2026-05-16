import { z } from 'zod';

const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

export const ApexRiskProfile = z.enum(['low', 'medium', 'high']);
export const ApexRunMode = z.enum(['outreach', 'upsell', 'retention', 'risk-shield']);
export const ApexDomainState = z.enum(['prospecting', 'monetizing', 'stabilizing', 'shielding']);

export const CreateApexPredatorDto = z.object({
  name: z.string().trim().min(2).max(255),
  budgetAllocated: z.number().finite().min(0).max(1_000_000_000).default(0),
  riskProfile: ApexRiskProfile.default('medium'),
}).strict();

export const RunApexPredatorDto = z.preprocess(
  emptyBody,
  z
    .object({
      mode: ApexRunMode.default('outreach'),
      intensity: z.number().int().min(1).max(100).default(30),
    })
    .strict()
);

export const ApexPredatorRunParamsDto = z.object({
  id: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid profile id format'),
}).strict();

export type CreateApexPredatorDtoType = z.infer<typeof CreateApexPredatorDto>;
export type RunApexPredatorDtoType = z.infer<typeof RunApexPredatorDto>;
export type ApexRiskProfileType = z.infer<typeof ApexRiskProfile>;
export type ApexRunModeType = z.infer<typeof ApexRunMode>;
export type ApexDomainStateType = z.infer<typeof ApexDomainState>;

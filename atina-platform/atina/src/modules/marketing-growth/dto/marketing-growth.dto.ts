import { z } from 'zod';

export const MarketingGrowthStatusDto = z.object({
  outreachEnabled: z.boolean(),
  autonomyMarketingEnabled: z.boolean(),
  leadDatabasePhase: z.string(),
  recommendedActions: z.array(z.string()),
});

export type MarketingGrowthStatusDtoType = z.infer<typeof MarketingGrowthStatusDto>;

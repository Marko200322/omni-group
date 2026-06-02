import type { CraftorNiche, CraftorV7Mode } from '../craftor.constants';

export type ModeYield = {
  leads: number;
  revenue: number;
  proposals?: number;
  jobsScored?: number;
  deals?: number;
  memoryEntries?: number;
  workflowStage: string;
  humanizationDelayMs?: number;
};

/** Deterministic fallback when scraper/storage delivery is unavailable. */
export const MODE_YIELDS: Record<CraftorV7Mode, ModeYield> = {
  hunting: { leads: 23, revenue: 60, workflowStage: 'job-detection' },
  'job-scoring': { leads: 0, revenue: 45, jobsScored: 18, workflowStage: 'lead-analysis' },
  proposal: { leads: 0, revenue: 80, proposals: 6, workflowStage: 'proposal-generation' },
  humanization: { leads: 0, revenue: 20, humanizationDelayMs: 2400, workflowStage: 'humanization' },
  outreach: { leads: 9, revenue: 140, proposals: 2, workflowStage: 'platform-sending' },
  negotiation: { leads: 4, revenue: 320, deals: 2, workflowStage: 'reply-analysis' },
  'reply-analysis': { leads: 3, revenue: 95, workflowStage: 'reply-analysis' },
  analytics: { leads: 0, revenue: 110, workflowStage: 'revenue-analytics' },
  ranking: { leads: 0, revenue: 55, workflowStage: 'crm-memory' },
  'memory-sync': { leads: 0, revenue: 35, memoryEntries: 5, workflowStage: 'crm-memory' },
};

export const NICHE_REVENUE_MULTIPLIER: Record<CraftorNiche, number> = {
  developer: 1.05,
  designer: 1,
  marketer: 1.12,
  copywriter: 1.08,
  editor: 0.98,
  consultant: 1.15,
  'ai-specialist': 1.2,
  'virtual-assistant': 0.95,
};

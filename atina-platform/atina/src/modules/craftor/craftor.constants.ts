/** Craftor V7 — Universal AI Operating System for freelance platforms (master blueprint). */
export const CRAFTOR_VERSION = '7.0.0';

export const CRAFTOR_PLATFORMS = ['upwork', 'fiverr', 'linkedin', 'freelancer'] as const;
export type CraftorPlatform = (typeof CRAFTOR_PLATFORMS)[number];

export const CRAFTOR_NICHES = [
  'developer',
  'designer',
  'marketer',
  'copywriter',
  'editor',
  'consultant',
  'ai-specialist',
  'virtual-assistant',
] as const;
export type CraftorNiche = (typeof CRAFTOR_NICHES)[number];

export const CRAFTOR_AGENTS = ['proposal', 'negotiation', 'ranking', 'analytics', 'outreach', 'memory'] as const;
export type CraftorAgent = (typeof CRAFTOR_AGENTS)[number];

/** V7 workflow run modes (hunting → memory-sync pipeline). */
export const CRAFTOR_V7_MODES = [
  'hunting',
  'job-scoring',
  'proposal',
  'humanization',
  'outreach',
  'negotiation',
  'reply-analysis',
  'analytics',
  'ranking',
  'memory-sync',
] as const;
export type CraftorV7Mode = (typeof CRAFTOR_V7_MODES)[number];

/** Legacy V6 modes — mapped to V7 internally; kept for workflow-chain templates. */
export const CRAFTOR_LEGACY_MODES = ['lead-hunt', 'follow-up', 'deal-close'] as const;
export type CraftorLegacyMode = (typeof CRAFTOR_LEGACY_MODES)[number];

export const CRAFTOR_RUN_MODES = [...CRAFTOR_V7_MODES, ...CRAFTOR_LEGACY_MODES] as const;
export type CraftorRunMode = (typeof CRAFTOR_RUN_MODES)[number];

export const LEGACY_TO_V7_MODE: Record<CraftorLegacyMode, CraftorV7Mode> = {
  'lead-hunt': 'hunting',
  'follow-up': 'outreach',
  'deal-close': 'negotiation',
};

export const CRAFTOR_WORKFLOW_STAGES = [
  'job-detection',
  'lead-analysis',
  'niche-classification',
  'proposal-generation',
  'humanization',
  'message-queue',
  'platform-sending',
  'reply-analysis',
  'crm-memory',
  'revenue-analytics',
] as const;

export const NICHE_COMMUNICATION_STYLE: Record<CraftorNiche, string> = {
  developer: 'technical',
  designer: 'portfolio-oriented',
  marketer: 'conversion-focused',
  copywriter: 'persuasion-focused',
  editor: 'precision-focused',
  consultant: 'advisory',
  'ai-specialist': 'innovation-focused',
  'virtual-assistant': 'operations-focused',
};

export const ANTI_DETECTION_LEVELS = ['low', 'medium', 'high'] as const;
export type AntiDetectionLevel = (typeof ANTI_DETECTION_LEVELS)[number];

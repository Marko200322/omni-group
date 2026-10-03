/** Omni Marketing Intelligence & Lead Engine — constants (observer only). */

export const MARKETING_ENGINE_VERSION = '1.0.0' as const;

export const CHANNEL_CODES = [
  'google_ads',
  'meta_ads',
  'linkedin',
  'email',
  'seo',
  'outbound',
  'referral',
  'organic_direct',
] as const;
export type ChannelCode = (typeof CHANNEL_CODES)[number];

export const ATTRIBUTION_MODELS = [
  'first_touch',
  'last_touch',
  'linear',
  'position',
  'time_decay',
  'weighted',
] as const;
export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];

export const BUDGET_BUCKETS = ['CORE', 'TEST', 'RESERVE'] as const;
export type BudgetBucket = (typeof BUDGET_BUCKETS)[number];

/** Default autonomy: observe + recommend only. */
export const DEFAULT_AUTONOMY_LEVEL = 1 as const;

export const DATA_KINDS = ['ACTUAL', 'ESTIMATE', 'FORECAST', 'SCENARIO', 'UNAVAILABLE'] as const;
export type DataKind = (typeof DATA_KINDS)[number];

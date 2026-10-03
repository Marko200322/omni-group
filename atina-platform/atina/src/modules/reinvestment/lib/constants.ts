/** Reinvestment Engine shared constants / enums. */

export const ENGINE_VERSION = '1.0.0' as const;
export const SCORING_VERSION = '1.0.0' as const;
export const POLICY_VERSION = '1.0.0' as const;
export const MODEL_VERSION = '1.0.0' as const;

export const ACCOUNT_CODES = {
  REVENUE: 'revenue',
  OPERATING: 'operating',
  SYSTEM: 'system',
  MARKETING: 'marketing',
  PROFIT_RESERVE: 'profit_reserve',
  TAX_RESERVE: 'tax_reserve',
  OWNER: 'owner',
} as const;

export type AccountCode = (typeof ACCOUNT_CODES)[keyof typeof ACCOUNT_CODES];

export const AUTONOMY_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export type OperatingMode =
  | 'growth'
  | 'normal'
  | 'conservation'
  | 'capital_preservation'
  | 'emergency';

export const OPERATING_MODES: readonly OperatingMode[] = [
  'growth',
  'normal',
  'conservation',
  'capital_preservation',
  'emergency',
] as const;

/** Utilization / spend alert bands (percent). */
export const ALERT_THRESHOLDS = [50, 75, 90, 100] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

export const TRANSFER_PURPOSES = [
  'reinvest',
  'ops_funding',
  'marketing_spend',
  'reserve_topup',
  'system_upgrade',
  'owner_draw',
  'tax_remittance',
  'other',
] as const;

export type TransferPurpose = (typeof TRANSFER_PURPOSES)[number];

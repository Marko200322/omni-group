import { optional, optionalNumber } from '../../config/env';

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function clampFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Conservative OMI AI spend / abuse defaults.
 * Intentionally NOT unlimited — raise via env when budget is funded.
 */
export type OmiUsageConfig = {
  monthlyBudgetUsd: number;
  dailyBudgetUsd: number;
  /** Percent of budget held in reserve; spendable = budget * (1 - reserve/100). */
  budgetReservePercent: number;
  anonymousDailyMessages: number;
  anonymousHourlyMessages: number;
  authDailyMessages: number;
  authMonthlyMessages: number;
  ipPerMinute: number;
  ipPerHour: number;
  maxMessagesPerConversation: number;
  maxExpertCallsPerConversation: number;
  maxToolCallsPerTurn: number;
  maxConcurrency: number;
  dedupeWindowMs: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxContextMessages: number;
  /** Estimator USD per 1k tokens (input+output blended) for Sol tier. */
  costSolPer1kTokensUsd: number;
  /** Estimator USD per 1k tokens for Luna tier. */
  costLunaPer1kTokensUsd: number;
  modelSol: string;
  modelLuna: string;
  alertEmail: string;
};

export function getOmiUsageConfig(): OmiUsageConfig {
  return {
    monthlyBudgetUsd: clampFloat(optionalNumber('OMI_MONTHLY_BUDGET_USD', 50), 1, 1_000_000),
    dailyBudgetUsd: clampFloat(optionalNumber('OMI_DAILY_BUDGET_USD', 5), 0.5, 100_000),
    budgetReservePercent: clampFloat(optionalNumber('OMI_BUDGET_RESERVE_PERCENT', 20), 0, 90),
    anonymousDailyMessages: clampInt(optionalNumber('OMI_ANONYMOUS_DAILY_MESSAGES', 20), 1, 10_000),
    anonymousHourlyMessages: clampInt(optionalNumber('OMI_ANONYMOUS_HOURLY_MESSAGES', 8), 1, 1000),
    authDailyMessages: clampInt(optionalNumber('OMI_AUTH_DAILY_MESSAGES', 60), 1, 50_000),
    authMonthlyMessages: clampInt(optionalNumber('OMI_AUTH_MONTHLY_MESSAGES', 500), 1, 500_000),
    ipPerMinute: clampInt(optionalNumber('OMI_IP_PER_MINUTE', 6), 1, 600),
    ipPerHour: clampInt(optionalNumber('OMI_IP_PER_HOUR', 40), 1, 10_000),
    maxMessagesPerConversation: clampInt(optionalNumber('OMI_MAX_MESSAGES_PER_CONVERSATION', 40), 2, 500),
    maxExpertCallsPerConversation: clampInt(
      optionalNumber('OMI_MAX_EXPERT_CALLS_PER_CONVERSATION', 3),
      0,
      50,
    ),
    maxToolCallsPerTurn: clampInt(optionalNumber('OMI_MAX_TOOL_CALLS_PER_TURN', 2), 0, 20),
    maxConcurrency: clampInt(optionalNumber('OMI_MAX_CONCURRENCY', 2), 1, 8),
    dedupeWindowMs: clampInt(optionalNumber('OMI_DEDUPE_WINDOW_MS', 3000), 500, 60_000),
    maxInputTokens: clampInt(optionalNumber('OMI_MAX_INPUT_TOKENS', 4000), 256, 128_000),
    maxOutputTokens: clampInt(optionalNumber('OMI_MAX_OUTPUT_TOKENS', 560), 64, 8192),
    maxContextMessages: clampInt(optionalNumber('OMI_MAX_CONTEXT_MESSAGES', 12), 2, 48),
    costSolPer1kTokensUsd: clampFloat(
      optionalNumber('OMI_COST_SOL_PER_1K_TOKENS_USD', 0.015),
      0.0001,
      10,
    ),
    costLunaPer1kTokensUsd: clampFloat(
      optionalNumber('OMI_COST_LUNA_PER_1K_TOKENS_USD', 0.003),
      0.0001,
      10,
    ),
    modelSol:
      optional('OMI_MODEL_SOL', optional('OMI_PRIMARY_MODEL', optional('AI_MODEL', 'openrouter/auto'))).trim() ||
      'openrouter/auto',
    modelLuna:
      optional('OMI_MODEL_LUNA', optional('OMI_SIMPLE_MODEL', 'openrouter/auto')).trim() || 'openrouter/auto',
    alertEmail: (
      optional('OMI_BUDGET_ALERT_EMAIL', '') ||
      optional('PAYMENT_NOTIFY_EMAIL', '') ||
      optional('ADMIN_EMAIL', 'admin@atina.io')
    ).trim(),
  };
}

export function spendableBudgetUsd(budgetUsd: number, reservePercent: number): number {
  const reserve = clampFloat(reservePercent, 0, 90);
  return Math.max(0, budgetUsd * (1 - reserve / 100));
}

export type OmiBudgetCeiling = 'sol' | 'luna' | 'none';

export function estimateCostUsd(
  tier: Exclude<OmiBudgetCeiling, 'none'>,
  totalTokens: number,
  cfg: OmiUsageConfig = getOmiUsageConfig(),
): number {
  const per1k = tier === 'sol' ? cfg.costSolPer1kTokensUsd : cfg.costLunaPer1kTokensUsd;
  const tokens = Math.max(0, totalTokens);
  return Math.round((tokens / 1000) * per1k * 1_000_000) / 1_000_000;
}

export function estimateTokensFromText(text: string): number {
  const len = text?.length ?? 0;
  // Rough ~4 chars/token; floor at 1 for non-empty.
  if (len <= 0) return 0;
  return Math.max(1, Math.ceil(len / 4));
}

import { AppError } from '../../utils/errors';
import {
  estimateCostUsd,
  estimateTokensFromText,
  getOmiUsageConfig,
  spendableBudgetUsd,
  type OmiBudgetCeiling,
  type OmiUsageConfig,
} from './omi-usage-config';
import {
  counterKey,
  getOmiUsageStore,
  getSpendUsd,
  isDuplicateMessage,
  recordSpendUsd,
  releaseConcurrency,
  tryAcquireConcurrency,
  ttlFor,
  utcStamp,
  type OmiUsageEvent,
  type OmiUsageStore,
} from './omi-usage-store';
import { maybeAlertOmiBudget } from './omi-usage-alerts';

export class OmiUsageBlockedError extends AppError {
  constructor(message: string, code = 'OMI_USAGE_LIMIT', details?: unknown) {
    super(message, 429, code, details);
  }
}

export type OmiGuardAudience = 'public' | 'portal';

export type OmiAdmitInput = {
  audience: OmiGuardAudience;
  sessionId: string;
  message: string;
  userId?: string | null;
  ip?: string | null;
  conversationUserMessageCount: number;
  expertCallsInConversation?: number;
  toolCallsThisTurn?: number;
};

export type OmiAdmitResult = {
  allowAi: boolean;
  /** Spend ceiling: sol=full routing, luna=simple-only, none=no paid AI. */
  modelTier: OmiBudgetCeiling;
  model?: string;
  maxOutputTokens: number;
  maxContextMessages: number;
  reason?: string;
  /** When true, reject the HTTP request (abuse / hard caps). */
  blockRequest: boolean;
  release: () => Promise<void>;
};

function identityKey(input: OmiAdmitInput): string {
  if (input.userId) return `user:${input.userId}`;
  return `anon:${(input.ip || 'unknown').trim() || 'unknown'}`;
}

async function checkMessageQuotas(
  store: OmiUsageStore,
  cfg: OmiUsageConfig,
  input: OmiAdmitInput,
): Promise<{ ok: boolean; reason?: string }> {
  const id = identityKey(input);
  const day = utcStamp('day');
  const hour = utcStamp('hour');
  const month = utcStamp('month');

  if (input.audience === 'public' || !input.userId) {
    const [hourly, daily] = await Promise.all([
      store.incr(counterKey(['msg', 'hour', id, hour]), 1, ttlFor('hour')),
      store.incr(counterKey(['msg', 'day', id, day]), 1, ttlFor('day')),
    ]);
    if (hourly > cfg.anonymousHourlyMessages) {
      return { ok: false, reason: 'anonymous_hourly_limit' };
    }
    if (daily > cfg.anonymousDailyMessages) {
      return { ok: false, reason: 'anonymous_daily_limit' };
    }
  } else {
    const [daily, monthly] = await Promise.all([
      store.incr(counterKey(['msg', 'day', id, day]), 1, ttlFor('day')),
      store.incr(counterKey(['msg', 'month', id, month]), 1, ttlFor('month')),
    ]);
    if (daily > cfg.authDailyMessages) {
      return { ok: false, reason: 'auth_daily_limit' };
    }
    if (monthly > cfg.authMonthlyMessages) {
      return { ok: false, reason: 'auth_monthly_limit' };
    }
  }
  return { ok: true };
}

async function resolveModelTier(
  store: OmiUsageStore,
  cfg: OmiUsageConfig,
): Promise<{ tier: OmiBudgetCeiling; reason?: string; spend: { daily: number; monthly: number } }> {
  // Fail CLOSED: if usage store is down, do not spend on AI.
  if (!(await store.ensureReady())) {
    return {
      tier: 'none',
      reason: 'usage_store_unavailable',
      spend: { daily: 0, monthly: 0 },
    };
  }

  let spend: { daily: number; monthly: number };
  try {
    spend = await getSpendUsd(store);
  } catch {
    return { tier: 'none', reason: 'usage_store_unavailable', spend: { daily: 0, monthly: 0 } };
  }

  const dailyCap = spendableBudgetUsd(cfg.dailyBudgetUsd, cfg.budgetReservePercent);
  const monthlyCap = spendableBudgetUsd(cfg.monthlyBudgetUsd, cfg.budgetReservePercent);

  if (spend.daily >= dailyCap || spend.monthly >= monthlyCap) {
    return { tier: 'none', reason: 'budget_exhausted', spend };
  }

  // Soft downgrade when past 75% of spendable budget (daily or monthly).
  const dailyPct = dailyCap > 0 ? spend.daily / dailyCap : 1;
  const monthlyPct = monthlyCap > 0 ? spend.monthly / monthlyCap : 1;
  if (dailyPct >= 0.75 || monthlyPct >= 0.75) {
    return { tier: 'luna', reason: 'budget_pressure_downgrade', spend };
  }

  return { tier: 'sol', spend };
}

export async function admitOmiChatTurn(
  input: OmiAdmitInput,
  store: OmiUsageStore = getOmiUsageStore(),
  cfg: OmiUsageConfig = getOmiUsageConfig(),
): Promise<OmiAdmitResult> {
  const noopRelease = async () => undefined;
  const maxOutputTokens = cfg.maxOutputTokens;
  const maxContextMessages = cfg.maxContextMessages;

  const block = (reason: string): OmiAdmitResult => ({
    allowAi: false,
    modelTier: 'none',
    maxOutputTokens,
    maxContextMessages,
    reason,
    blockRequest: true,
    release: noopRelease,
  });

  // Hard conversation / tool / expert caps (no Redis required).
  if (input.conversationUserMessageCount >= cfg.maxMessagesPerConversation) {
    await recordBlocked(store, input, 'conversation_message_cap');
    return block('conversation_message_cap');
  }
  if ((input.expertCallsInConversation ?? 0) > cfg.maxExpertCallsPerConversation) {
    await recordBlocked(store, input, 'expert_call_cap');
    return block('expert_call_cap');
  }
  if ((input.toolCallsThisTurn ?? 0) > cfg.maxToolCallsPerTurn) {
    await recordBlocked(store, input, 'tool_call_cap');
    return block('tool_call_cap');
  }

  // Fail-closed for spend accounting: if store is down, still allow deterministic fallback
  // but never paid AI. Message quotas that need Redis also fail closed as block.
  if (!(await store.ensureReady())) {
    await recordBlocked(store, input, 'usage_store_unavailable').catch(() => undefined);
    return {
      allowAi: false,
      modelTier: 'none',
      maxOutputTokens,
      maxContextMessages,
      reason: 'usage_store_unavailable',
      blockRequest: false,
      release: noopRelease,
    };
  }

  try {
    if (await isDuplicateMessage(store, input.sessionId, input.message)) {
      await recordBlocked(store, input, 'duplicate_message');
      return block('duplicate_message');
    }

    const quotas = await checkMessageQuotas(store, cfg, input);
    if (!quotas.ok) {
      await recordBlocked(store, input, quotas.reason || 'message_quota');
      return block(quotas.reason || 'message_quota');
    }

    const slot = identityKey(input);
    const gotSlot = await tryAcquireConcurrency(store, slot);
    if (!gotSlot) {
      await recordBlocked(store, input, 'concurrency_limit');
      return block('concurrency_limit');
    }

    const release = async () => {
      await releaseConcurrency(store, slot);
    };

    await store.incr(counterKey(['req', 'day', utcStamp('day')]), 1, ttlFor('day'));
    await store.incr(counterKey(['req', 'month', utcStamp('month')]), 1, ttlFor('month'));
    await store.zincr(
      counterKey(['sessions', 'day', utcStamp('day')]),
      input.sessionId,
      1,
      ttlFor('day'),
    );

    const { tier, reason, spend } = await resolveModelTier(store, cfg);
    await maybeAlertOmiBudget(spend, cfg).catch(() => undefined);

    if (tier === 'none') {
      await store.pushEvent({
        at: new Date().toISOString(),
        kind: 'fallback',
        reason: reason || 'no_ai',
        sessionId: input.sessionId,
        audience: input.audience,
        modelTier: 'none',
      });
      return {
        allowAi: false,
        modelTier: 'none',
        maxOutputTokens,
        maxContextMessages,
        reason: reason || 'no_ai',
        blockRequest: false,
        release,
      };
    }

    if (tier === 'luna' && reason === 'budget_pressure_downgrade') {
      await store.pushEvent({
        at: new Date().toISOString(),
        kind: 'downgrade',
        reason,
        sessionId: input.sessionId,
        audience: input.audience,
        modelTier: 'luna',
        model: cfg.modelLuna,
      });
    }

    return {
      allowAi: true,
      modelTier: tier,
      model: tier === 'sol' ? cfg.modelSol : cfg.modelLuna,
      maxOutputTokens,
      maxContextMessages,
      reason,
      blockRequest: false,
      release,
    };
  } catch (err) {
    // Any store failure → fail closed for AI.
    await recordBlocked(store, input, 'usage_store_unavailable').catch(() => undefined);
    return {
      allowAi: false,
      modelTier: 'none',
      maxOutputTokens,
      maxContextMessages,
      reason: 'usage_store_unavailable',
      blockRequest: false,
      release: noopRelease,
    };
  }
}

async function recordBlocked(
  store: OmiUsageStore,
  input: OmiAdmitInput,
  reason: string,
): Promise<void> {
  if (!(await store.ensureReady())) return;
  try {
    await store.incr(counterKey(['blocked', 'day', utcStamp('day')]), 1, ttlFor('day'));
    await store.incr(counterKey(['blocked', 'month', utcStamp('month')]), 1, ttlFor('month'));
    await store.pushEvent({
      at: new Date().toISOString(),
      kind: 'blocked',
      reason,
      sessionId: input.sessionId,
      audience: input.audience,
    });
  } catch {
    /* ignore */
  }
}

export type OmiUsageRecordInput = {
  sessionId: string;
  audience: OmiGuardAudience;
  modelTier: OmiBudgetCeiling;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  success: boolean;
  userMessage?: string;
  assistantMessage?: string;
};

export async function recordOmiAiUsage(
  input: OmiUsageRecordInput,
  store: OmiUsageStore = getOmiUsageStore(),
  cfg: OmiUsageConfig = getOmiUsageConfig(),
): Promise<void> {
  if (!(await store.ensureReady()) || input.modelTier === 'none') return;

  const tokensIn =
    input.tokensIn ??
    estimateTokensFromText(input.userMessage ?? '');
  const tokensOut =
    input.tokensOut ??
    estimateTokensFromText(input.assistantMessage ?? '');
  const total = tokensIn + tokensOut;
  const costUsd = estimateCostUsd(input.modelTier, total, cfg);
  const modelLabel = input.model || input.modelTier;

  try {
    await recordSpendUsd(store, costUsd);
    await store.hincr(
      counterKey(['cost_model', 'day', utcStamp('day')]),
      modelLabel,
      Math.round(costUsd * 1_000_000),
      ttlFor('day'),
    );
    await store.hincr(
      counterKey(['cost_model_req', 'day', utcStamp('day')]),
      modelLabel,
      1,
      ttlFor('day'),
    );
    await store.zincr(
      counterKey(['session_cost', 'day', utcStamp('day')]),
      input.sessionId,
      Math.round(costUsd * 1_000_000),
      ttlFor('day'),
    );

    const event: OmiUsageEvent = {
      at: new Date().toISOString(),
      kind: input.success ? 'ai_success' : 'ai_fail',
      modelTier: input.modelTier,
      model: modelLabel,
      sessionId: input.sessionId,
      audience: input.audience,
      tokensIn,
      tokensOut,
      costUsd,
      success: input.success,
    };
    await store.pushEvent(event);

    const spend = await getSpendUsd(store);
    await maybeAlertOmiBudget(spend, cfg);
  } catch {
    /* never throw from telemetry */
  }
}

export function throwIfBlocked(result: OmiAdmitResult): void {
  if (!result.blockRequest) return;
  throw new OmiUsageBlockedError('OMI usage limit exceeded', 'OMI_USAGE_LIMIT', {
    reason: result.reason,
  });
}

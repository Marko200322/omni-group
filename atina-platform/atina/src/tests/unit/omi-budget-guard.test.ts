import {
  admitOmiChatTurn,
  recordOmiAiUsage,
  throwIfBlocked,
  OmiUsageBlockedError,
} from '../../modules/omi/omi-budget-guard';
import {
  estimateCostUsd,
  getOmiUsageConfig,
  spendableBudgetUsd,
} from '../../modules/omi/omi-usage-config';
import { getOmiUsageDashboard } from '../../modules/omi/omi-usage-admin';
import {
  MemoryOmiUsageStore,
  recordSpendUsd,
  setOmiUsageStoreForTests,
} from '../../modules/omi/omi-usage-store';
import { resetOmiAlertDedupeForTests } from '../../modules/omi/omi-usage-alerts';
import { completeOmiLlmTurn, resolveOmiModelTier } from '../../modules/omi/omi-llm-router';
import { config } from '../../config';

const mockAi = {
  configured: true,
  chatCompletions: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => ({
    isConfigured: () => mockAi.configured,
    chatCompletions: (...args: unknown[]) => mockAi.chatCompletions(...args),
  }),
}));

jest.mock('../../modules/notifications/service/notifications.service', () => ({
  NotificationsService: class {
    sendEmail = jest.fn().mockResolvedValue(undefined);
  },
}));

describe('OMI usage / budget guards', () => {
  let store: MemoryOmiUsageStore;

  beforeEach(() => {
    store = new MemoryOmiUsageStore(true);
    setOmiUsageStoreForTests(store);
    resetOmiAlertDedupeForTests();
    mockAi.configured = true;
    mockAi.chatCompletions.mockReset();
    mockAi.chatCompletions.mockResolvedValue({ content: 'ok', model: 'test' });
    config.aggregators.omiSimpleModel = 'luna-model';
    config.aggregators.omiPrimaryModel = 'sol-model';
    config.aggregators.omiExpertModel = 'astra-model';
  });

  afterEach(() => {
    setOmiUsageStoreForTests(null);
  });

  it('uses conservative spendable budget with reserve', () => {
    expect(spendableBudgetUsd(100, 20)).toBe(80);
    expect(spendableBudgetUsd(5, 20)).toBe(4);
    const cfg = getOmiUsageConfig();
    expect(cfg.monthlyBudgetUsd).toBeGreaterThan(0);
    expect(cfg.dailyBudgetUsd).toBeGreaterThan(0);
    expect(cfg.anonymousDailyMessages).toBeLessThan(10_000);
  });

  it('fail-closed: usage store unavailable disables paid AI but does not hard-block chat', async () => {
    store.setReady(false);
    const admit = await admitOmiChatTurn(
      {
        audience: 'public',
        sessionId: 's1',
        message: 'hello pricing',
        ip: '203.0.113.10',
        conversationUserMessageCount: 0,
      },
      store,
    );
    expect(admit.blockRequest).toBe(false);
    expect(admit.allowAi).toBe(false);
    expect(admit.modelTier).toBe('none');
    expect(admit.reason).toBe('usage_store_unavailable');
  });

  it('blocks anonymous hourly then daily message abuse', async () => {
    process.env.OMI_ANONYMOUS_HOURLY_MESSAGES = '3';
    process.env.OMI_ANONYMOUS_DAILY_MESSAGES = '5';
    jest.resetModules();
    const { admitOmiChatTurn: admit, throwIfBlocked: throwBlocked, OmiUsageBlockedError: Err } =
      await import('../../modules/omi/omi-budget-guard');
    const { getOmiUsageConfig: cfgFn } = await import('../../modules/omi/omi-usage-config');
    const { setOmiUsageStoreForTests: setStore, MemoryOmiUsageStore: Mem } =
      await import('../../modules/omi/omi-usage-store');
    const local = new Mem(true);
    setStore(local);
    const cfg = cfgFn();
    expect(cfg.anonymousHourlyMessages).toBe(3);
    expect(cfg.anonymousDailyMessages).toBe(5);

    for (let i = 0; i < 3; i++) {
      const ok = await admit(
        {
          audience: 'public',
          sessionId: `s-${i}`,
          message: `unique message ${i}-${Date.now()}`,
          ip: '203.0.113.20',
          conversationUserMessageCount: 0,
        },
        local,
        cfg,
      );
      expect(ok.blockRequest).toBe(false);
      await ok.release();
    }
    const hourlyBlocked = await admit(
      {
        audience: 'public',
        sessionId: 's-hourly',
        message: `hourly overflow ${Date.now()}`,
        ip: '203.0.113.20',
        conversationUserMessageCount: 0,
      },
      local,
      cfg,
    );
    expect(hourlyBlocked.blockRequest).toBe(true);
    expect(hourlyBlocked.reason).toBe('anonymous_hourly_limit');
    expect(() => throwBlocked(hourlyBlocked)).toThrow(Err);

    // Fresh IP hits daily cap when hourly is raised above daily.
    const cfgDaily = { ...cfg, anonymousHourlyMessages: 100, anonymousDailyMessages: 2 };
    for (let i = 0; i < 2; i++) {
      const ok = await admit(
        {
          audience: 'public',
          sessionId: `d-${i}`,
          message: `daily unique ${i}-${Date.now()}`,
          ip: '203.0.113.99',
          conversationUserMessageCount: 0,
        },
        local,
        cfgDaily,
      );
      expect(ok.blockRequest).toBe(false);
      await ok.release();
    }
    const dailyBlocked = await admit(
      {
        audience: 'public',
        sessionId: 'd-over',
        message: `daily overflow ${Date.now()}`,
        ip: '203.0.113.99',
        conversationUserMessageCount: 0,
      },
      local,
      cfgDaily,
    );
    expect(dailyBlocked.blockRequest).toBe(true);
    expect(dailyBlocked.reason).toBe('anonymous_daily_limit');

    delete process.env.OMI_ANONYMOUS_HOURLY_MESSAGES;
    delete process.env.OMI_ANONYMOUS_DAILY_MESSAGES;
  });

  it('dedupes short-window duplicate messages', async () => {
    const first = await admitOmiChatTurn(
      {
        audience: 'public',
        sessionId: 'dup-session',
        message: 'Same question twice',
        ip: '203.0.113.30',
        conversationUserMessageCount: 0,
      },
      store,
    );
    expect(first.blockRequest).toBe(false);
    await first.release();

    const dup = await admitOmiChatTurn(
      {
        audience: 'public',
        sessionId: 'dup-session',
        message: 'Same question twice',
        ip: '203.0.113.30',
        conversationUserMessageCount: 1,
      },
      store,
    );
    expect(dup.blockRequest).toBe(true);
    expect(dup.reason).toBe('duplicate_message');
  });

  it('enforces per-conversation message cap', async () => {
    const cfg = getOmiUsageConfig();
    const admit = await admitOmiChatTurn(
      {
        audience: 'portal',
        sessionId: 'long',
        message: 'keep going',
        userId: 'user-1',
        conversationUserMessageCount: cfg.maxMessagesPerConversation,
      },
      store,
    );
    expect(admit.blockRequest).toBe(true);
    expect(admit.reason).toBe('conversation_message_cap');
  });

  it('downgrades Sol→Luna under budget pressure and none when exhausted', async () => {
    const cfg = getOmiUsageConfig();
    const dailySpendable = spendableBudgetUsd(cfg.dailyBudgetUsd, cfg.budgetReservePercent);

    await recordSpendUsd(store, dailySpendable * 0.8);
    const pressure = await admitOmiChatTurn(
      {
        audience: 'public',
        sessionId: 'budget-1',
        message: 'tell me about automation for my shop',
        ip: '203.0.113.40',
        conversationUserMessageCount: 0,
      },
      store,
    );
    expect(pressure.allowAi).toBe(true);
    expect(pressure.modelTier).toBe('luna');
    expect(pressure.reason).toBe('budget_pressure_downgrade');
    await pressure.release();

    await recordSpendUsd(store, dailySpendable);
    const exhausted = await admitOmiChatTurn(
      {
        audience: 'public',
        sessionId: 'budget-2',
        message: 'another consult question please',
        ip: '203.0.113.41',
        conversationUserMessageCount: 0,
      },
      store,
    );
    expect(exhausted.allowAi).toBe(false);
    expect(exhausted.modelTier).toBe('none');
    expect(exhausted.reason).toBe('budget_exhausted');
    await exhausted.release();
  });

  it('completeOmiLlmTurn respects budgetCeiling Luna and none', async () => {
    const expertMsg =
      'We need multi-tenant architecture, GDPR compliance, SOC2, and a bespoke ERP migration with custom integration.';
    expect(resolveOmiModelTier({ userMessage: expertMsg, history: [], audience: 'public' })).toBe(
      'expert',
    );

    const luna = await completeOmiLlmTurn({
      systemPersona: 'You are Omi',
      userMessage: expertMsg,
      history: [],
      audience: 'public',
      budgetCeiling: 'luna',
      allowAi: true,
    });
    expect(luna?.tier).toBe('simple');
    expect(luna?.model).toBe('luna-model');
    expect(mockAi.chatCompletions).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'luna-model' }),
    );

    mockAi.chatCompletions.mockClear();
    const none = await completeOmiLlmTurn({
      systemPersona: 'You are Omi',
      userMessage: expertMsg,
      history: [],
      audience: 'public',
      budgetCeiling: 'none',
      allowAi: false,
    });
    expect(none).toBeNull();
    expect(mockAi.chatCompletions).not.toHaveBeenCalled();
  });

  it('records usage metadata without secrets and builds admin dashboard', async () => {
    await recordOmiAiUsage(
      {
        sessionId: 'sess-admin',
        audience: 'public',
        modelTier: 'luna',
        model: 'luna-model',
        success: true,
        tokensIn: 100,
        tokensOut: 50,
      },
      store,
    );
    const dash = await getOmiUsageDashboard(store);
    expect(dash.storeReady).toBe(true);
    expect(dash.budget.aiAllowed).toBe(true);
    expect(dash.costByModel.some((r) => r.model === 'luna-model')).toBe(true);
    expect(JSON.stringify(dash)).not.toMatch(/sk-|OPENROUTER|api[_-]?key/i);
    expect(estimateCostUsd('luna', 150)).toBeGreaterThan(0);
  });

  it('admin dashboard fail-closed when store not ready', async () => {
    store.setReady(false);
    const dash = await getOmiUsageDashboard(store);
    expect(dash.failClosed).toBe(true);
    expect(dash.budget.aiAllowed).toBe(false);
  });
});

import {
  envKeyPresent,
  getFactoryPhaseCeiling,
  isFactoryPhaseAutoEnabled,
  keysAllowPhase,
  requiredKeysForPhase,
  resolveEffectiveFactoryPhase,
  revenueAllowsPhase,
  type FactoryRevenueMetrics,
} from '../../modules/billing/lib/factory-phase-effective';
import { isFactoryModuleEnabled } from '../../modules/billing/lib/factory-phase-runtime';
import { buildFactoryPhaseStatus } from '../../modules/billing/lib/factory-phase-modules';
import {
  __resetFactoryPhaseAutoCacheForTests,
  __setFactoryPhaseAutoCacheForTests,
  factoryPhaseAutoService,
} from '../../modules/billing/service/factory-phase-auto.service';
import { FactoryPhaseMetricsRepository } from '../../modules/billing/repository/factory-phase-metrics.repository';

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

describe('factory-phase-effective extras', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    OPENROUTER_API_KEY: 'sk-or-test',
    MANUAL_PAYMENT_IBAN: 'RS35100000000000000000',
    RESEND_API_KEY: 're_test',
    CONTACT_EMAIL_FROM: 'noreply@example.com',
    CONTACT_EMAIL_TO: 'owner@example.com',
    FACTORY_PHASE_AUTO: 'true',
  };

  const zero: FactoryRevenueMetrics = {
    confirmedPaymentCount: 0,
    confirmedRevenueEur: 0,
    fulfilledPackageCount: 0,
    estimatedMrrEur: 0,
  };

  it('envKeyPresent rejects placeholders and default stripe prices', () => {
    expect(envKeyPresent('X', { X: 'placeholder' })).toBe(false);
    expect(envKeyPresent('X', { X: 'your_key' })).toBe(false);
    expect(envKeyPresent('STARTER_PRICE_ID', { STARTER_PRICE_ID: 'price_starter' })).toBe(false);
    expect(envKeyPresent('STARTER_PRICE_ID', { STARTER_PRICE_ID: 'price_live_1' })).toBe(true);
  });

  it('isFactoryPhaseAutoEnabled reads AUTO and flag', () => {
    expect(isFactoryPhaseAutoEnabled({ FACTORY_PHASE: 'AUTO' })).toBe(true);
    expect(isFactoryPhaseAutoEnabled({ FACTORY_PHASE_AUTO: 'yes' })).toBe(true);
    expect(isFactoryPhaseAutoEnabled({ FACTORY_PHASE: 'M0', FACTORY_PHASE_AUTO: 'false' })).toBe(false);
  });

  it('getFactoryPhaseCeiling uses M6 for AUTO else configured', () => {
    expect(getFactoryPhaseCeiling({ FACTORY_PHASE: 'AUTO' })).toBe('M6');
    expect(getFactoryPhaseCeiling({ FACTORY_PHASE: 'M3', FACTORY_PHASE_AUTO: 'false' })).toBe('M3');
    expect(getFactoryPhaseCeiling({})).toBe('M0');
  });

  it('revenue gates for M3 via fulfilled packages', () => {
    expect(revenueAllowsPhase('M3', { ...zero, fulfilledPackageCount: 3 })).toBe(true);
    expect(revenueAllowsPhase('M3', { ...zero, fulfilledPackageCount: 2 })).toBe(false);
  });

  it('revenue gates for M4/M5', () => {
    expect(revenueAllowsPhase('M4', { ...zero, estimatedMrrEur: 600 })).toBe(true);
    expect(revenueAllowsPhase('M5', { ...zero, estimatedMrrEur: 1499 })).toBe(false);
    expect(revenueAllowsPhase('M5', { ...zero, estimatedMrrEur: 1500 })).toBe(true);
  });

  it('requiredKeysForPhase accumulates through phase', () => {
    const keys = requiredKeysForPhase('M2');
    expect(keys).toEqual(
      expect.arrayContaining(['OPENROUTER_API_KEY', 'MANUAL_PAYMENT_IBAN', 'RESEND_API_KEY', 'SCRAPER_KEY']),
    );
  });

  it('M3 unlocks when keys and fulfilled gate met', () => {
    const env = { ...baseEnv, SCRAPER_KEY: 'scraper' };
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 4, confirmedRevenueEur: 1000, fulfilledPackageCount: 3, estimatedMrrEur: 100 },
      env,
    );
    expect(b.effective).toBe('M3');
  });

  it('M4 blocked without hunter even with MRR', () => {
    const env = { ...baseEnv, SCRAPER_KEY: 's' };
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 10, confirmedRevenueEur: 5000, fulfilledPackageCount: 5, estimatedMrrEur: 700 },
      env,
    );
    expect(b.effective).toBe('M3');
    expect(b.blockedNext).toBe('M4');
    expect(keysAllowPhase('M4', env)).toBe(false);
  });
});

describe('factory-phase-runtime AUTO', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    __resetFactoryPhaseAutoCacheForTests();
  });

  it('enables scraper from SCRAPER_KEY when AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.FACTORY_PHASE = 'M6';
    process.env.SCRAPER_KEY = 'apify';
    expect(isFactoryModuleEnabled('scraper', 'M2')).toBe(true);
  });

  it('enables autonomy at M5 when AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    expect(isFactoryModuleEnabled('autonomy', 'M5')).toBe(true);
    expect(isFactoryModuleEnabled('autonomy_marketing', 'M5')).toBe(true);
  });

  it('enables hunter from HUNTER key when AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.HUNTER_API_KEY = 'hunter';
    expect(isFactoryModuleEnabled('hunter', 'M2')).toBe(true);
    expect(isFactoryModuleEnabled('lead_db', 'M4')).toBe(true);
  });

  it('enables inbound from Resend key when AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.RESEND_API_KEY = 're_x';
    expect(isFactoryModuleEnabled('inbound', 'M1')).toBe(true);
  });

  it('enables avatar when HeyGen key and AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.HEYGEN_API_KEY = 'hg';
    expect(isFactoryModuleEnabled('avatar', 'M6')).toBe(true);
  });

  it('enables outbound_draft when scraper key and AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.SCRAPER_KEY = 's';
    expect(isFactoryModuleEnabled('outbound_draft', 'M2')).toBe(true);
  });

  it('enables outbound_send at M4 when AUTO', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    expect(isFactoryModuleEnabled('outbound_send', 'M4')).toBe(true);
  });

  it('lists module status snapshot', () => {
    process.env.FACTORY_PHASE = 'M0';
    process.env.FACTORY_PHASE_AUTO = 'false';
    const { listFactoryModuleStatus, getFactoryRuntimeSnapshot } = require('../../modules/billing/lib/factory-phase-runtime');
    expect(listFactoryModuleStatus('M0').length).toBeGreaterThan(5);
    const snap = getFactoryRuntimeSnapshot();
    expect(snap.phase).toBeDefined();
    expect(Array.isArray(snap.modules)).toBe(true);
  });
});

describe('factory-phase-auto.service', () => {
  const { query } = jest.requireMock('../../database/connection') as {
    query: jest.Mock;
  };

  beforeEach(() => {
    __resetFactoryPhaseAutoCacheForTests();
    query.mockReset();
    process.env.FACTORY_PHASE_AUTO = 'true';
    process.env.OPENROUTER_API_KEY = 'sk';
    process.env.MANUAL_PAYMENT_IBAN = 'RS00';
    process.env.RESEND_API_KEY = 're';
    process.env.CONTACT_EMAIL_FROM = 'a@b.c';
    process.env.CONTACT_EMAIL_TO = 'c@d.e';
    process.env.FACTORY_PHASE_AUTO_STATE_PATH = require('path').join(
      require('os').tmpdir(),
      `factory-phase-auto-${Date.now()}.json`,
    );
  });

  afterEach(() => {
    factoryPhaseAutoService.stopPeriodicEvaluation();
    __resetFactoryPhaseAutoCacheForTests();
  });

  it('evaluate loads metrics and caches effective phase', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '1', revenue: '249' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ mrr: '99' }] });

    const b = await factoryPhaseAutoService.evaluate({ notify: false });
    expect(b.effective).toBe('M1');
    expect(factoryPhaseAutoService.getCachedEffectivePhase()).toBe('M1');
    expect(factoryPhaseAutoService.getCachedBreakdown()?.metrics.confirmedPaymentCount).toBe(1);
  });

  it('metrics repo returns zeros on query failure', async () => {
    query.mockRejectedValue(new Error('db down'));
    const repo = new FactoryPhaseMetricsRepository();
    const m = await repo.loadMetrics();
    expect(m.confirmedPaymentCount).toBe(0);
    expect(m.estimatedMrrEur).toBe(0);
  });

  it('getCachedEffectivePhase uses zero-revenue floor before evaluate', () => {
    __setFactoryPhaseAutoCacheForTests(null);
    const phase = factoryPhaseAutoService.getCachedEffectivePhase();
    expect(['M0', 'M1']).toContain(phase);
  });
});

describe('buildFactoryPhaseStatus includes auto when cached', () => {
  afterEach(() => {
    __resetFactoryPhaseAutoCacheForTests();
  });

  it('embeds auto breakdown when cache set', () => {
    process.env.FACTORY_PHASE_AUTO = 'true';
    __setFactoryPhaseAutoCacheForTests({
      ceiling: 'M6',
      autoEnabled: true,
      keysOkThrough: 'M1',
      revenueOkThrough: 'M0',
      effective: 'M0',
      blockedNext: 'M1',
      blockedReason: 'Revenue gate not met for M1',
      metrics: {
        confirmedPaymentCount: 0,
        confirmedRevenueEur: 0,
        fulfilledPackageCount: 0,
        estimatedMrrEur: 0,
      },
    });
    const status = buildFactoryPhaseStatus();
    expect(status.auto).toMatchObject({ enabled: true, effective: 'M0', ceiling: 'M6' });
  });
});

import {
  keysAllowPhase,
  resolveEffectiveFactoryPhase,
  revenueAllowsPhase,
  type FactoryRevenueMetrics,
} from '../../modules/billing/lib/factory-phase-effective';

describe('factory-phase-effective', () => {
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

  it('stays M0 until first confirmed payment even with Resend keys', () => {
    const b = resolveEffectiveFactoryPhase(zero, baseEnv);
    expect(b.effective).toBe('M0');
    expect(b.keysOkThrough).toBe('M1');
    expect(b.revenueOkThrough).toBe('M0');
  });

  it('advances to M1 after first payment when Resend keys present', () => {
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 1, confirmedRevenueEur: 249 },
      baseEnv,
    );
    expect(b.effective).toBe('M1');
  });

  it('blocks M2 without scraper key even with MRR', () => {
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 5, confirmedRevenueEur: 900, estimatedMrrEur: 250 },
      baseEnv,
    );
    expect(b.effective).toBe('M1');
    expect(b.blockedNext).toBe('M2');
    expect(b.blockedReason).toMatch(/SCRAPER_KEY/);
  });

  it('reaches M2 with scraper + revenue', () => {
    const env = { ...baseEnv, SCRAPER_KEY: 'apify-test' };
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 5, confirmedRevenueEur: 900, estimatedMrrEur: 250 },
      env,
    );
    expect(b.effective).toBe('M2');
  });

  it('hard ceiling without AUTO', () => {
    const env = { ...baseEnv, FACTORY_PHASE_AUTO: 'false', FACTORY_PHASE: 'M0', SCRAPER_KEY: 'x' };
    const b = resolveEffectiveFactoryPhase(
      { ...zero, confirmedPaymentCount: 10, confirmedRevenueEur: 5000, estimatedMrrEur: 2000 },
      env,
    );
    expect(b.autoEnabled).toBe(false);
    expect(b.ceiling).toBe('M0');
    expect(b.effective).toBe('M0');
  });

  it('M6 requires Stripe keys and MRR', () => {
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      SCRAPER_KEY: 's',
      HUNTER_API_KEY: 'h',
      STRIPE_SECRET_KEY: 'sk_live_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
      STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
      STARTER_PRICE_ID: 'price_1',
      PRO_PRICE_ID: 'price_2',
      ENTERPRISE_PRICE_ID: 'price_3',
    };
    expect(keysAllowPhase('M6', env)).toBe(true);
    expect(revenueAllowsPhase('M6', { ...zero, estimatedMrrEur: 2000 })).toBe(true);
    const b = resolveEffectiveFactoryPhase(
      {
        confirmedPaymentCount: 20,
        confirmedRevenueEur: 10000,
        fulfilledPackageCount: 5,
        estimatedMrrEur: 2000,
      },
      env,
    );
    expect(b.effective).toBe('M6');
  });
});

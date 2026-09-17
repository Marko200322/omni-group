import {
  auditFactoryPhaseGaps,
  getActiveFactoryModuleProfile,
  getFactoryModuleProfiles,
} from '../../modules/billing/lib/factory-phase-modules';

describe('factory-phase-modules', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('has profile for each M0-M6', () => {
    const phases = getFactoryModuleProfiles().map((p) => p.phase);
    expect(phases).toEqual(['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']);
  });

  it('M4 profile merges lead machine modules', () => {
    process.env.FACTORY_PHASE = 'M4';
    const p = getActiveFactoryModuleProfile('M4');
    expect(p.modules.lead_db).toBe(true);
    expect(p.modules.outreach_send).toBe(true);
    expect(p.modules.scraper).toBe(true);
  });

  it('M0 gaps include IBAN when missing', () => {
    process.env.FACTORY_PHASE = 'M0';
    delete process.env.MANUAL_PAYMENT_IBAN;
    delete process.env.OPENROUTER_API_KEY;
    const gaps = auditFactoryPhaseGaps('M0');
    expect(gaps.some((g) => g.key === 'MANUAL_PAYMENT_IBAN')).toBe(true);
  });

  it('M1 gaps flag Resend when missing', () => {
    process.env.FACTORY_PHASE = 'M1';
    delete process.env.RESEND_API_KEY;
    const gaps = auditFactoryPhaseGaps('M1');
    expect(gaps.some((g) => g.key === 'RESEND_API_KEY' || g.key === 'RESEND_DOMAIN')).toBe(true);
  });
});

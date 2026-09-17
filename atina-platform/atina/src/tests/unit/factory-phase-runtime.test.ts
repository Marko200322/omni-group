import { config } from '../../config';
import { isFactoryModuleEnabled } from '../../modules/billing/lib/factory-phase-runtime';

describe('factory-phase-runtime', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('M0 disables scraper when env off', () => {
    process.env.FACTORY_PHASE = 'M0';
    process.env.ENABLE_SCRAPER = 'false';
    expect(isFactoryModuleEnabled('scraper', 'M0')).toBe(false);
    expect(isFactoryModuleEnabled('autonomy', 'M0')).toBe(false);
  });

  it('M2 enables scraper when env on', () => {
    process.env.FACTORY_PHASE = 'M2';
    process.env.ENABLE_SCRAPER = 'true';
    (config.features as { scraper: boolean }).scraper = true;
    expect(isFactoryModuleEnabled('scraper', 'M2')).toBe(true);
  });

  it('M4 outbound send requires warmup', () => {
    process.env.FACTORY_PHASE = 'M4';
    process.env.OUTREACH_DOMAIN_WARMUP_COMPLETE = 'true';
    (config.outreach as { dailyCap: number; domainWarmupComplete: boolean }).dailyCap = 50;
    (config.outreach as { domainWarmupComplete: boolean }).domainWarmupComplete = true;
    expect(isFactoryModuleEnabled('outbound_send', 'M4')).toBe(true);
  });
});

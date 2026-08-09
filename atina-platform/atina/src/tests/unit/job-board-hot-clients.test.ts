import { countJobBoardPlatforms, listJobBoardPlatforms } from '../../modules/client-hunter/data/job-board-catalog';
import { listHuntLocaleCodes } from '../../modules/client-hunter/data/hunt-locales';
import { computeHeatScore, resolveHeatBand } from '../../modules/client-hunter/service/hot-clients.service';

describe('job-board-catalog', () => {
  it('lists 50+ enabled platforms globally', () => {
    const stats = countJobBoardPlatforms();
    expect(stats.total).toBeGreaterThanOrEqual(50);
    expect(stats.byLocale.de).toBeGreaterThan(0);
    expect(stats.byLocale.en).toBeGreaterThan(0);
  });

  it('filters by region DE', () => {
    const de = listJobBoardPlatforms({ region: 'DE', limit: 20 });
    expect(de.some((p) => p.slug === 'stepstone_de')).toBe(true);
  });

  it('excludes government platforms by default filter', () => {
    const commercial = listJobBoardPlatforms({ excludeKinds: ['government'], limit: 30 });
    expect(commercial.every((p) => p.kind !== 'government')).toBe(true);
    expect(commercial.some((p) => p.slug === 'stepstone_de' || p.slug === 'upwork')).toBe(true);
  });

  it('has government platforms disabled in catalog', () => {
    const gov = listJobBoardPlatforms({ enabledOnly: false }).filter((p) => p.kind === 'government');
    expect(gov.length).toBeGreaterThan(0);
    expect(gov.every((p) => p.enabled === false)).toBe(true);
  });

  it('supports 20+ hunt locales', () => {
    expect(listHuntLocaleCodes().length).toBeGreaterThanOrEqual(20);
  });
});

describe('hot-clients heat', () => {
  it('scores burning when job + salary + email', () => {
    const score = computeHeatScore(
      {
        userId: 'u1',
        platformSlug: 'stepstone_de',
        jobPostingExcerpt: 'x'.repeat(120),
        salaryGrossMonthlyEur: 3200,
        companyName: 'Müller GmbH',
        roleTitle: 'Datenerfassung',
        city: 'Frankfurt',
        hasEmail: true,
        huntIntensity: 80,
      },
      listJobBoardPlatforms({ slugs: ['stepstone_de'] })[0],
    );
    expect(score).toBeGreaterThanOrEqual(85);
    expect(resolveHeatBand(score)).toBe('burning');
  });
});

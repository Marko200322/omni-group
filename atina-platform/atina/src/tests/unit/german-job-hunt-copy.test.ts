import {
  EXAMPLE_GERMAN_JOB_POSTING,
  assembleGermanJobHuntBody,
  buildFallbackGermanJobHuntEmail,
  computeGermanJobHuntEconomics,
  germanJobHuntToOutboundMarkdown,
  isGermanJobPostingContext,
  normalizeGermanJobPostingContext,
  parseGermanJobHuntModelJson,
  parseSalaryFromGermanPosting,
} from '../../modules/client-hunter/lib/german-job-hunt-copy';

describe('german-job-hunt-copy', () => {
  it('parses €3.200 brutto from example posting', () => {
    expect(parseSalaryFromGermanPosting(EXAMPLE_GERMAN_JOB_POSTING)).toBe(3200);
  });

  it('computes Atina price at ~25% of salary with savings', () => {
    const econ = computeGermanJobHuntEconomics(3200, 0.25);
    expect(econ.atinaMonthlyEur).toBe(800);
    expect(econ.monthlySavingsEur).toBe(2400);
    expect(econ.savingsPercent).toBe(75);
    expect(econ.annualSavingsEur).toBe(28800);
  });

  it('parses model JSON with German fields', () => {
    const parsed = parseGermanJobHuntModelJson(
      JSON.stringify({
        betreff: 'Bezüglich Ihrer Stellenanzeige für Datenerfassung in Frankfurt / Automatisierung',
        icebreaker: 'Ich sehe, dass Sie manuell SAP befüllen.',
        offer_and_math: 'Atina kostet nur 800 EUR.',
        cta: 'Darf ich Ihnen das 90-Sekunden-Video senden?',
      }),
    );
    expect(parsed?.subject).toContain('Frankfurt');
    expect(parsed?.cta).toContain('90');
  });

  it('builds fallback email in German with economics', () => {
    const email = buildFallbackGermanJobHuntEmail(
      {
        jobPostingText: EXAMPLE_GERMAN_JOB_POSTING,
        companyName: 'Müller Logistik GmbH',
        city: 'Frankfurt am Main',
        roleTitle: 'Datenerfassung',
        salaryGrossMonthlyEur: 3200,
      },
      computeGermanJobHuntEconomics(3200),
    );
    expect(email.betreff).toMatch(/Stellenanzeige/i);
    expect(email.bodyDe).toMatch(/Atina/i);
    expect(email.bodyDe).toMatch(/800/);
    expect(email.bodyDe).toMatch(/90-Sekunden/i);
  });

  it('detects german job scrape context', () => {
    expect(isGermanJobPostingContext({ hunt_mode: 'job_intercept' })).toBe(true);
    expect(isGermanJobPostingContext({ hunt_mode: 'german_job_intercept' })).toBe(true);
    expect(isGermanJobPostingContext({ job_posting_text: 'Stellenanzeige: Mitarbeiter/in Datenerfassung (m/w/d) in Frankfurt — manuelle SAP-Erfassung.' })).toBe(true);
    expect(isGermanJobPostingContext({ platforms: ['linkedin'] })).toBe(false);
  });

  it('normalizes scrape context and renders outbound markdown', () => {
    const ctx = normalizeGermanJobPostingContext({
      hunt_mode: 'german_job_intercept',
      job_posting_text: EXAMPLE_GERMAN_JOB_POSTING,
      company_name: 'Müller Logistik GmbH',
      city: 'Frankfurt am Main',
      role_title: 'Datenerfassung',
    });
    expect(ctx.salaryGrossMonthlyEur).toBe(3200);
    const email = buildFallbackGermanJobHuntEmail(ctx, computeGermanJobHuntEconomics(3200));
    const md = germanJobHuntToOutboundMarkdown({
      ...email,
      subject: email.betreff,
      body: email.bodyDe,
      locale: 'de',
    });
    expect(md).toContain('**Subject A:**');
    expect(md).toContain('job_intercept');
  });

  it('assembles body with sign-off', () => {
    const body = assembleGermanJobHuntBody({
      icebreaker: 'A',
      offerAndMath: 'B',
      cta: 'C',
      senderName: 'Test Sender',
    });
    expect(body).toContain('Mit freundlichen Grüßen');
    expect(body).toContain('Test Sender');
  });
});

import {
  ACCOUNT_CODES,
  ALERT_THRESHOLDS,
  AUTONOMY_LEVELS,
  ENGINE_VERSION,
  POLICY_VERSION,
  SCORING_VERSION,
} from '../../modules/reinvestment/lib/constants';
import { normalizeDemandPhrases } from '../../modules/reinvestment/lib/demand-normalize';
import { buildIdempotencyKey, applyBps, eurToCents, centsToEur, roundEur } from '../../modules/reinvestment/lib/money';
import { deriveOperatingMode } from '../../modules/reinvestment/lib/modes';
import { evaluateTransferPolicy } from '../../modules/reinvestment/lib/policy-engine';
import { computeRoiScenarios } from '../../modules/reinvestment/lib/roi';
import { checkCapitalPreservation, computeRunwayMonths } from '../../modules/reinvestment/lib/runway';
import { scoreOpportunity } from '../../modules/reinvestment/lib/scoring';
import { simulateBusinessMonths } from '../../modules/reinvestment/lib/simulation';
import { assessRisk } from '../../modules/reinvestment/lib/risk-engine';

describe('reinvestment core', () => {
  it('exports stable versions, autonomy 0–5, and alert thresholds', () => {
    expect(ENGINE_VERSION).toBe('1.0.0');
    expect(SCORING_VERSION).toBe('1.0.0');
    expect(POLICY_VERSION).toBe('1.0.0');
    expect([...AUTONOMY_LEVELS]).toEqual([0, 1, 2, 3, 4, 5]);
    expect([...ALERT_THRESHOLDS]).toEqual([50, 75, 90, 100]);
  });

  it('keeps ledger math in integer cents (bps + display helpers)', () => {
    expect(applyBps(10_000, 250)).toBe(250);
    expect(applyBps(100, 1)).toBe(0);
    expect(centsToEur(12_345)).toBe(123.45);
    expect(roundEur(1.234)).toBe(1.23);
    expect(roundEur(1.235)).toBe(1.24);
    expect(eurToCents(10.5)).toBe(1050);
    expect(() => applyBps(10.5 as unknown as number, 100)).toThrow(/integer/);
  });

  it('builds duplicate-safe idempotency keys', () => {
    const a = buildIdempotencyKey('transfer', ACCOUNT_CODES.REVENUE, ACCOUNT_CODES.SYSTEM, 5000, '2026-09-30');
    const b = buildIdempotencyKey('transfer', ACCOUNT_CODES.REVENUE, ACCOUNT_CODES.SYSTEM, 5000, '2026-09-30');
    expect(a).toBe(b);
    expect(a).toBe('ri:transfer:revenue:system:5000:2026-09-30');
  });

  it('blocks profit_reserve drains below min reserve', () => {
    const result = evaluateTransferPolicy({
      amountCents: 50_000,
      sourceAccount: ACCOUNT_CODES.PROFIT_RESERVE,
      destAccount: ACCOUNT_CODES.REVENUE,
      purpose: 'ops_funding',
      autonomyLevel: 5,
      dryRun: true,
      killSwitch: false,
      limits: { maxTransferCents: 1_000_000 },
      allowMarketingReallocation: false,
      reserveFloorCents: 100_000,
      availableAfterCents: 80_000,
    });
    expect(result.decision).toBe('BLOCKED');
    expect(result.reasons).toContain('profit_reserve_below_floor');
  });

  it('blocks marketing→system diversion unless allowMarketingReallocation', () => {
    const blocked = evaluateTransferPolicy({
      amountCents: 10_000,
      sourceAccount: ACCOUNT_CODES.MARKETING,
      destAccount: ACCOUNT_CODES.SYSTEM,
      purpose: 'system_upgrade',
      autonomyLevel: 5,
      dryRun: false,
      killSwitch: false,
      limits: { maxTransferCents: 1_000_000 },
      allowMarketingReallocation: false,
      reserveFloorCents: 0,
      availableAfterCents: 0,
    });
    expect(blocked.decision).toBe('BLOCKED');
    expect(blocked.reasons).toContain('marketing_to_system_reallocation_blocked');

    const allowed = evaluateTransferPolicy({
      amountCents: 10_000,
      sourceAccount: ACCOUNT_CODES.MARKETING,
      destAccount: ACCOUNT_CODES.SYSTEM,
      purpose: 'system_upgrade',
      autonomyLevel: 5,
      dryRun: false,
      killSwitch: false,
      limits: { maxTransferCents: 1_000_000 },
      allowMarketingReallocation: true,
      reserveFloorCents: 0,
      availableAfterCents: 0,
    });
    expect(allowed.decision).toBe('APPROVED');
  });

  it('fail-closes on kill switch', () => {
    const result = evaluateTransferPolicy({
      amountCents: 1,
      sourceAccount: ACCOUNT_CODES.REVENUE,
      destAccount: ACCOUNT_CODES.SYSTEM,
      purpose: 'reinvest',
      autonomyLevel: 5,
      dryRun: true,
      killSwitch: true,
      limits: { maxTransferCents: 1_000_000 },
      allowMarketingReallocation: true,
      reserveFloorCents: 0,
      availableAfterCents: 999_999,
    });
    expect(result.decision).toBe('BLOCKED');
    expect(result.reasons).toEqual(['kill_switch_active']);
  });

  it('computes non-guaranteed ROI scenarios with payback and labels', () => {
    const roi = computeRoiScenarios({
      initialCostCents: 120_000,
      monthlyCostCents: 5_000,
      monthlyRevenueCents: 20_000,
      monthlyVariableCents: 2_000,
    });
    expect(roi.conservative.label).toBe('ESTIMATE');
    expect(roi.base.label).toBe('FORECAST');
    expect(roi.upside.label).toBe('SCENARIO');
    expect(roi.base.guaranteed).toBe(false);
    expect(roi.base.kind).toBe('non_guaranteed');
    expect(roi.base.contributionCents).toBe(13_000);
    expect(roi.base.paybackMonths).toBeCloseTo(120_000 / 13_000);
    expect(roi.conservative.contributionCents).toBeLessThan(roi.base.contributionCents);
    expect(roi.upside.contributionCents).toBeGreaterThan(roi.base.contributionCents);
    expect(roi.disclaimer).toMatch(/non-guaranteed/i);
  });

  it('scores opportunities with WHY referencing input factors', () => {
    const factors = {
      demand: 80,
      revenuePotential: 70,
      margin: 60,
      devCost: 40,
      deliveryCost: 30,
      payback: 50,
      strategic: 55,
      customerImpact: 65,
      automation: 75,
      complexity: 20,
      operationalRisk: 15,
      securityRisk: 10,
      complianceRisk: 5,
      confidence: 90,
      urgency: 85,
      capacity: 50,
    };
    const scored = scoreOpportunity({ factors });
    expect(scored.priorityScore).toBeGreaterThanOrEqual(0);
    expect(scored.priorityScore).toBeLessThanOrEqual(100);
    expect(scored.why).toContain('demand=80');
    expect(scored.why).toContain('revenuePotential=70');
    expect(scored.why).toContain('confidence=90');
    expect(scored.why).toContain('urgency=85');
    expect(scored.scoringVersion).toBe(SCORING_VERSION);

    const again = scoreOpportunity({ factors });
    expect(again.priorityScore).toBe(scored.priorityScore);
    expect(again.why).toBe(scored.why);
  });

  it('computes runway and capital preservation vs min months', () => {
    const runway = computeRunwayMonths(300_000, -50_000);
    expect(runway.infinite).toBe(false);
    expect(runway.runwayMonths).toBe(6);

    const infinite = computeRunwayMonths(100_000, 5_000);
    expect(infinite.infinite).toBe(true);

    const check = checkCapitalPreservation(100_000, -50_000, 3);
    expect(check.required).toBe(true);
    expect(check.reason).toBe('runway_below_minimum');

    const ok = checkCapitalPreservation(200_000, -50_000, 3);
    expect(ok.required).toBe(false);
  });

  it('normalizes demand phrases into synonym clusters', () => {
    const clusters = normalizeDemandPhrases([
      'Need Salesforce CRM integration with SAP ERP',
      'Too much copy paste between spreadsheets',
      'Automate approval workflow with n8n',
      'Broken invoicing and dunning reminders',
      'Helpdesk knowledge base / FAQ docs',
      'Unrelated hobby gardening tips',
    ]);
    const codes = clusters.map((c) => c.code);
    expect(codes).toEqual([
      'crm_erp_integration',
      'manual_data_transfer',
      'workflow_automation',
      'invoicing',
      'support_docs',
    ]);
    expect(clusters.find((c) => c.code === 'crm_erp_integration')?.phrases[0]).toMatch(/Salesforce/i);
  });

  it('simulates 12 months and reports reserve breaches', () => {
    const sim = simulateBusinessMonths({
      startingCashCents: 50_000,
      startingReserveCents: 40_000,
      reserveFloorCents: 30_000,
      baseMonthlyRevenueCents: 20_000,
      baseMonthlyExpenseCents: 25_000,
      shockMonth: 3,
      unexpectedCostCents: 80_000,
      revenueDropMonth: 4,
      revenueDropBps: 5000,
    });
    expect(sim.months).toHaveLength(12);
    expect(sim.reserveBreaches.length).toBeGreaterThan(0);
    expect(sim.months.some((m) => m.reserveBreached)).toBe(true);
    expect(sim.months[2]?.expenseCents).toBeGreaterThan(25_000);
  });

  it('derives operating mode and assesses risk', () => {
    expect(
      deriveOperatingMode({
        cashCents: 10_000,
        monthlyNetCents: -50_000,
        revenueTrend: 'down',
        emergencyCashFloorCents: 50_000,
      }),
    ).toBe('emergency');

    expect(
      deriveOperatingMode({
        cashCents: 200_000,
        monthlyNetCents: -80_000,
        revenueTrend: 'flat',
        minRunwayMonths: 3,
        emergencyCashFloorCents: 10_000,
      }),
    ).toBe('capital_preservation');

    const risk = assessRisk({
      amountCents: 90_000,
      maxTransferCents: 100_000,
      runwayMonths: 2,
      reserveBreachRisk: true,
      operatingMode: 'conservation',
    });
    expect(['high', 'critical']).toContain(risk.level);
    expect(risk.reasons).toEqual(
      expect.arrayContaining(['reserve_breach_risk', 'runway_under_3_months']),
    );
  });
});

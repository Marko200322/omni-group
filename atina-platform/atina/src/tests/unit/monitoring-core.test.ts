import {
  MONITORING_ENGINE_VERSION,
  SEVERITIES,
  SUBSYSTEM_CODES,
} from '../../modules/monitoring/lib/constants';
import { computeOverallState } from '../../modules/monitoring/lib/health-score';
import { thresholdDetect, baselineDetect, trendDetect } from '../../modules/monitoring/lib/anomaly';
import { redactSecrets } from '../../modules/monitoring/lib/redact';
import { rankAttentionItems } from '../../modules/monitoring/lib/attention';
import { buildDedupeKey, shouldSuppress } from '../../modules/monitoring/lib/dedupe';

describe('monitoring core', () => {
  it('exports engine version, severities, and seed subsystem codes', () => {
    expect(MONITORING_ENGINE_VERSION).toBe('1.0.0');
    expect([...SEVERITIES]).toEqual(['info', 'warning', 'high', 'critical']);
    expect(SUBSYSTEM_CODES).toContain('monitoring');
    expect(SUBSYSTEM_CODES).toContain('database');
    expect(SUBSYSTEM_CODES).toContain('payments');
  });

  it('marks MONITORING_DEGRADED when monitoring_self is unavailable and never claims healthy', () => {
    const result = computeOverallState([
      { code: 'api', status: 'healthy', isCritical: true },
      { code: 'database', status: 'healthy', isCritical: true },
      { code: 'monitoring', status: 'unavailable', isCritical: true },
    ]);
    expect(result.state).toBe('MONITORING_DEGRADED');
    expect(result.healthyClaimAllowed).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['monitoring_self_unavailable', 'cannot_claim_everything_healthy'])
    );
  });

  it('marks MONITORING_DEGRADED when monitoring_self is missing', () => {
    const result = computeOverallState([{ code: 'api', status: 'healthy', isCritical: true }]);
    expect(result.state).toBe('MONITORING_DEGRADED');
    expect(result.healthyClaimAllowed).toBe(false);
    expect(result.reasons).toContain('monitoring_self_missing');
  });

  it('returns OPERATIONAL only when monitoring_self is healthy and all others healthy', () => {
    const result = computeOverallState([
      { code: 'api', status: 'healthy', isCritical: true },
      { code: 'monitoring', status: 'healthy', isCritical: true },
    ]);
    expect(result.state).toBe('OPERATIONAL');
    expect(result.healthyClaimAllowed).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('detects threshold anomalies without inventing metrics', () => {
    const hit = thresholdDetect({
      metricKey: 'latency_ms',
      value: 1200,
      warnAbove: 500,
      criticalAbove: 1000,
    });
    expect(hit.isAnomaly).toBe(true);
    expect(hit.detector).toBe('threshold');
    expect(hit.score).toBeGreaterThan(0);
    expect(hit.message).toMatch(/critical_above/);

    const ok = thresholdDetect({
      metricKey: 'latency_ms',
      value: 100,
      warnAbove: 500,
      criticalAbove: 1000,
    });
    expect(ok.isAnomaly).toBe(false);
  });

  it('baseline and trend detectors require real samples', () => {
    expect(
      baselineDetect({
        metricKey: 'req_rate',
        value: 100,
        mean: 10,
        stddev: 2,
        sampleCount: 20,
      }).isAnomaly
    ).toBe(true);

    expect(
      baselineDetect({
        metricKey: 'req_rate',
        value: 100,
        mean: 10,
        stddev: 0,
        sampleCount: 20,
      }).isAnomaly
    ).toBe(false);

    expect(
      trendDetect({
        metricKey: 'errors',
        values: [1, 1, 10, 12],
        changeRatio: 0.5,
      }).isAnomaly
    ).toBe(true);

    expect(trendDetect({ metricKey: 'errors', values: [1, 2] }).isAnomaly).toBe(false);
  });

  it('redacts sk_/pk_/whsec_/passwords/Bearer tokens', () => {
    const raw =
      'key=sk_test_ABC123xyz password=supersecret Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 whsec_abc123 pk_live_PUB';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toMatch(/sk_test_ABC/);
    expect(redacted).not.toMatch(/pk_live_PUB/);
    expect(redacted).not.toMatch(/whsec_abc/);
    expect(redacted).not.toMatch(/supersecret/);
    expect(redacted).toMatch(/REDACTED/);

    const obj = redactSecrets({
      stripeSecretKey: 'sk_live_REAL',
      password: 'hunter2',
      nested: { authorization: 'Bearer tok123', ok: true },
    });
    expect(obj.stripeSecretKey).toBe('[REDACTED]');
    expect(obj.password).toBe('[REDACTED]');
    expect(obj.nested.authorization).toBe('[REDACTED]');
    expect(obj.nested.ok).toBe(true);
  });

  it('ranks attention by severity then businessImpact then urgency', () => {
    const ranked = rankAttentionItems([
      {
        id: 'a',
        title: 'info',
        severity: 'info',
        businessImpact: 100,
        urgency: 100,
      },
      {
        id: 'b',
        title: 'critical low',
        severity: 'critical',
        businessImpact: 10,
        urgency: 10,
      },
      {
        id: 'c',
        title: 'critical high',
        severity: 'critical',
        businessImpact: 90,
        urgency: 50,
      },
      {
        id: 'd',
        title: 'warning',
        severity: 'warning',
        businessImpact: 80,
        urgency: 80,
      },
    ]);
    expect(ranked.map((i) => i.id)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('builds stable dedupe keys and respects cooldown', () => {
    const a = buildDedupeKey('database', 'Database down');
    const b = buildDedupeKey('database', 'Database down');
    const c = buildDedupeKey('database', 'Database lag');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('mon:')).toBe(true);

    const now = Date.parse('2026-09-30T12:00:00.000Z');
    expect(shouldSuppress(null, 300, now)).toBe(false);
    expect(shouldSuppress(new Date(now - 60_000), 300, now)).toBe(true);
    expect(shouldSuppress(new Date(now - 400_000), 300, now)).toBe(false);
  });
});

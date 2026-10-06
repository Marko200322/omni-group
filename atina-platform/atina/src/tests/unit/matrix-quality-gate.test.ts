import { resolveMatrixQualityGate } from '../../modules/billing/lib/matrix-quality-gate';

describe('resolveMatrixQualityGate (anti fake-pass)', () => {
  it('refuses PASS when job has no checklist, substance, or publicUrl', () => {
    const d = resolveMatrixQualityGate({});
    expect(d).toEqual({
      decision: 'fail',
      reason: 'No quality evidence (checklist/substance/publicUrl) — refusing fake PASS',
    });
  });

  it('passes on checklistScore/checklistPassed from job API', () => {
    const d = resolveMatrixQualityGate({
      checklistScore: 88,
      checklistPassed: true,
    });
    expect(d).toEqual({ decision: 'pass', gate: 'checklist', score: '88' });
  });

  it('fails when checklistPassed is true but score is empty (old fake-PASS shape)', () => {
    const d = resolveMatrixQualityGate({
      checklistScore: null,
      checklistPassed: true,
    });
    expect(d.decision).toBe('fail');
    if (d.decision === 'fail') {
      expect(d.reason).toMatch(/checklistScore missing/);
    }
  });

  it('fails when checklist.passed is false', () => {
    const d = resolveMatrixQualityGate({
      checklistScore: 40,
      checklistPassed: false,
    });
    expect(d).toEqual({
      decision: 'fail',
      reason: 'Checklist failed (40pct)',
    });
  });

  it('reads nested fulfillmentMeta.checklist when top-level fields absent', () => {
    const d = resolveMatrixQualityGate({
      fulfillmentMeta: { checklist: { score: '91', passed: true, items: [] } },
    });
    expect(d).toEqual({ decision: 'pass', gate: 'checklist', score: '91' });
  });

  it('falls back to documentSubstanceOk with score tag', () => {
    const d = resolveMatrixQualityGate({
      documentSubstanceOk: true,
      documentQuality: { totalBodyChars: 5048 },
    });
    expect(d).toEqual({
      decision: 'pass',
      gate: 'documentSubstanceOk',
      score: 'sub:5048',
    });
  });

  it('requests live URL verify when only publicUrl is present', () => {
    const d = resolveMatrixQualityGate({
      publicUrl: '/sites/fitness-studio-abc',
    });
    expect(d).toEqual({
      decision: 'need_live_url',
      publicUrl: '/sites/fitness-studio-abc',
    });
  });

  it('does not treat completed + artifacts alone as quality evidence', () => {
    const d = resolveMatrixQualityGate({
      documentSubstanceOk: false,
      publicUrl: null,
      checklistScore: null,
      checklistPassed: null,
    });
    expect(d.decision).toBe('fail');
  });
});

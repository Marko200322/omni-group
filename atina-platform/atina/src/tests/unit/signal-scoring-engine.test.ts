import { scoreProblemSignal } from '../../modules/problem-hunter/lib/signal-scoring-engine';
import type { NormalizedProblemSignal } from '../../modules/problem-hunter/lib/problem-normalizer';

const baseSignal: NormalizedProblemSignal = {
  detectedProblem: 'Need CRM automation',
  problemCategory: 'automation',
  originalContext: 'We need automation for manual data entry',
  companyName: 'Acme GmbH',
  sourceUrl: 'https://example.com/post/1',
  factLines: ['Source URL: https://example.com/post/1', 'Excerpt: manual data entry'],
  inferenceLines: ['Buying intent keywords detected in public text', 'Problem category inferred: automation'],
  unknownLines: [],
  urgency: 'high',
  confidenceScore: 80,
};

describe('scoreProblemSignal', () => {
  it('returns score 0-100 with reasons', () => {
    const r = scoreProblemSignal(baseSignal);
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.matchedDeliverableId).toBe('workflow-design');
  });

  it('scores lower without buying intent', () => {
    const weak = scoreProblemSignal({
      ...baseSignal,
      urgency: 'low',
      inferenceLines: ['Problem category inferred: general'],
      confidenceScore: 30,
    });
    expect(weak.score).toBeLessThan(scoreProblemSignal(baseSignal).score);
  });
});

import {
  score0to100,
  stableStringify,
} from '../../modules/titan-score/lib/deterministic-score';

describe('titan-score deterministic-score', () => {
  it('stableStringify is order-insensitive for objects', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it('score0to100 is in 0..100', () => {
    for (let i = 0; i < 50; i++) {
      const s = score0to100(`seed-${i}`);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('score0to100 is stable for same seed', () => {
    const a = score0to100('hello-titan');
    const b = score0to100('hello-titan');
    expect(a).toBe(b);
  });
});

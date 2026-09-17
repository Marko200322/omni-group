import { problemDedupPrefix, problemDedupFingerprint } from '../../modules/problem-hunter/lib/signal-dedup';

describe('signal-dedup', () => {
  it('normalizes problem prefix for cross-source match', () => {
    expect(problemDedupPrefix('  Slow Website Load  ')).toBe('slow website load');
  });

  it('builds stable fingerprint from category + problem', () => {
    const a = problemDedupFingerprint('performance', 'Site loads in 8s on mobile');
    const b = problemDedupFingerprint('performance', 'Site loads in 8s on mobile');
    const c = problemDedupFingerprint('security', 'Site loads in 8s on mobile');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

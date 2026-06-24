import {
  comparePhase,
  maxPhase,
  parsePhase,
  PHASE_ORDER,
  resolvePhaseFromEnv,
} from '../../core/phase-env';

describe('phase-env', () => {
  const savedPhase = process.env.PHASE;

  afterEach(() => {
    if (savedPhase === undefined) delete process.env.PHASE;
    else process.env.PHASE = savedPhase;
  });

  it('parsePhase accepts v1-v6 and rejects unknown values', () => {
    for (const phase of PHASE_ORDER) {
      expect(parsePhase(phase)).toBe(phase);
      expect(parsePhase(` ${phase.toUpperCase()} `)).toBe(phase);
    }
    expect(parsePhase('v7')).toBeNull();
    expect(parsePhase(undefined)).toBeNull();
    expect(parsePhase('')).toBeNull();
  });

  it('comparePhase orders phases correctly', () => {
    expect(comparePhase('v6', 'v1')).toBeGreaterThan(0);
    expect(comparePhase('v2', 'v2')).toBe(0);
    expect(comparePhase('v1', 'v3')).toBeLessThan(0);
  });

  it('maxPhase returns the later phase', () => {
    expect(maxPhase('v2', 'v5')).toBe('v5');
    expect(maxPhase('v6', 'v3')).toBe('v6');
    expect(maxPhase('v4', 'v4')).toBe('v4');
  });

  it('resolvePhaseFromEnv prefers valid PHASE env', () => {
    process.env.PHASE = 'v3';
    expect(resolvePhaseFromEnv()).toBe('v3');
    process.env.PHASE = 'invalid';
    expect(resolvePhaseFromEnv()).toBe('v1');
    delete process.env.PHASE;
    expect(resolvePhaseFromEnv()).toBe('v1');
  });
});

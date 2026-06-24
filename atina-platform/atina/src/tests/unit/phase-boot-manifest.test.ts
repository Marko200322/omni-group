import {
  EDGE_SWARM_MAX_PROFILES_PRE_V6,
  EDGE_SWARM_MAX_PROFILES_V6,
  edgeSwarmProfileCap,
  manifestStepsUpTo,
  orderedPhasesThrough,
  phaseRequiresPdfSignoff,
  PHASE_BOOT_MANIFEST,
} from '../../core/phase-boot-manifest';

describe('phase-boot-manifest', () => {
  it('defines six boot steps ending at v6', () => {
    expect(PHASE_BOOT_MANIFEST).toHaveLength(6);
    expect(PHASE_BOOT_MANIFEST.at(-1)?.phase).toBe('v6');
    expect(PHASE_BOOT_MANIFEST.at(-1)?.requiresPdfLegalSignoff).toBe(true);
  });

  it('manifestStepsUpTo v3 includes v1-v3 only', () => {
    const steps = manifestStepsUpTo('v3');
    expect(steps.map((s) => s.phase)).toEqual(['v1', 'v2', 'v3']);
  });

  it('edgeSwarmProfileCap respects v6 threshold', () => {
    expect(edgeSwarmProfileCap('v5')).toBe(EDGE_SWARM_MAX_PROFILES_PRE_V6);
    expect(edgeSwarmProfileCap('v6')).toBe(EDGE_SWARM_MAX_PROFILES_V6);
  });

  it('phaseRequiresPdfSignoff only from v6', () => {
    expect(phaseRequiresPdfSignoff('v5')).toBe(false);
    expect(phaseRequiresPdfSignoff('v6')).toBe(true);
  });

  it('orderedPhasesThrough returns prefix of phase order', () => {
    expect(orderedPhasesThrough('v4')).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(orderedPhasesThrough('invalid' as 'v1')).toEqual(['v1']);
  });
});

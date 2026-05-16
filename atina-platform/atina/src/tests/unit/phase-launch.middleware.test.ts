import {
  getModulePhaseGatingStatus,
  getModulePhaseRequirements,
  getPhaseOrder,
  resetPhaseActivationCache,
} from '../../modules/phase-launch/middleware/phase-activation.middleware';

describe('phase-activation.middleware helpers', () => {
  beforeEach(() => {
    resetPhaseActivationCache();
  });

  it('getPhaseOrder lists phases in order', () => {
    expect(getPhaseOrder()[0]).toBe('v1');
    expect(getPhaseOrder()).toContain('v6');
  });

  it('getModulePhaseRequirements returns a shallow copy', () => {
    const a = getModulePhaseRequirements();
    const b = getModulePhaseRequirements();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('getModulePhaseGatingStatus marks omnigame locked at v1', () => {
    const rows = getModulePhaseGatingStatus('v1');
    const omnigame = rows.find((r) => r.moduleSlug === 'omnigame');
    expect(omnigame?.requiredPhase).toBe('v3');
    expect(omnigame?.unlocked).toBe(false);
  });

  it('getModulePhaseGatingStatus marks craftor unlocked at v1', () => {
    const rows = getModulePhaseGatingStatus('v1');
    const craftor = rows.find((r) => r.moduleSlug === 'craftor');
    expect(craftor?.requiredPhase).toBe('v1');
    expect(craftor?.unlocked).toBe(true);
  });
});

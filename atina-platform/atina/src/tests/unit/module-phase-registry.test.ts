import { MODULE_PHASE_REGISTRY } from '../../core/module-phase-registry';
import { getModulePhaseRequirements } from '../../modules/phase-launch/middleware/phase-activation.middleware';

describe('MODULE_PHASE_REGISTRY', () => {
  it('includes alert-system and scaling', () => {
    expect(MODULE_PHASE_REGISTRY['alert-system']).toBe('v1');
    expect(MODULE_PHASE_REGISTRY.scaling).toBe('v2');
  });

  it('getModulePhaseRequirements exposes registry slugs', () => {
    const reqs = getModulePhaseRequirements();
    expect(reqs['alert-system']).toBe('v1');
    expect(reqs.scaling).toBe('v2');
    expect(Object.keys(reqs).length).toBeGreaterThan(40);
  });
});

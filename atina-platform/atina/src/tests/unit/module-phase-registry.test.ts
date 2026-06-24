import { MODULE_PHASE_REGISTRY } from '../../core/module-phase-registry';
import { getModulePhaseRequirements } from '../../modules/phase-launch/middleware/phase-activation.middleware';

describe('MODULE_PHASE_REGISTRY', () => {
  it('includes alert-system and scaling (v5 K8s vision)', () => {
    expect(MODULE_PHASE_REGISTRY['alert-system']).toBe('v1');
    expect(MODULE_PHASE_REGISTRY.scaling).toBe('v5');
    expect(MODULE_PHASE_REGISTRY['edge-swarm']).toBe('v6');
    expect(MODULE_PHASE_REGISTRY['pdf-legal-alignment']).toBe('v6');
  });

  it('getModulePhaseRequirements exposes registry slugs', () => {
    const reqs = getModulePhaseRequirements();
    expect(reqs['alert-system']).toBe('v1');
    expect(reqs.scaling).toBe('v5');
    expect(reqs['edge-swarm']).toBe('v6');
    expect(Object.keys(reqs).length).toBeGreaterThan(40);
  });
});

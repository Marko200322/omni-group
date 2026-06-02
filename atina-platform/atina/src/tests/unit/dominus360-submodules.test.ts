import { DOMINUS_SUBMODULES } from '../../modules/dominus360/dominus360-submodules';
import { Dominus360Service } from '../../modules/dominus360/service/dominus360.service';

describe('Dominus360 submodules registry', () => {
  it('exposes v3–v6 entries for CEO matrix', () => {
    const versions = DOMINUS_SUBMODULES.map((m) => m.version);
    expect(versions).toEqual(expect.arrayContaining(['v3', 'v4', 'v5', 'v6']));
    expect(DOMINUS_SUBMODULES.find((m) => m.id === 'v3-swarm')?.ceo_status).toBe('n/a');
  });

  it('service returns submodule catalog', () => {
    const svc = new Dominus360Service();
    expect(svc.getSubmodules()).toHaveLength(4);
  });
});

jest.mock('../../../../config', () => ({
  config: {
    autonomy: { realEcosystemRuns: true },
  },
}));

jest.mock('../../../../modules/client-hunter/service/client-hunter.service', () => ({
  ClientHunterService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/craftor/service/craftor.service', () => ({
  CraftorService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/forge/service/forge.service', () => ({
  ForgeService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/titan-master/service/titan-master.service', () => ({
  TitanMasterService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/apex-predator/service/apex-predator.service', () => ({
  ApexPredatorService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/dominus360/service/dominus360.service', () => ({
  Dominus360Service: jest.fn().mockImplementation(() => ({})),
}));

import { EcosystemRunExecutor } from '../../../../modules/shared/ecosystem-run.executor';

describe('EcosystemRunExecutor', () => {
  it('supports key ecosystem modules', () => {
    const ex = new EcosystemRunExecutor();
    expect(ex.supports('forge')).toBe(true);
    expect(ex.supports('craftor')).toBe(true);
    expect(ex.supports('unknown-module')).toBe(false);
  });

  it('reports real execution enabled from config', () => {
    const ex = new EcosystemRunExecutor();
    expect(ex.isRealExecutionEnabled()).toBe(true);
  });
});

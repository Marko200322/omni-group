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
jest.mock('../../../../modules/lead-scoring/service/lead-scoring.service', () => ({
  LeadScoringService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/outreach/service/outreach.service', () => ({
  OutreachService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/titanis/service/titanis.service', () => ({
  TitanisService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/follow-up-automation/service/follow-up-automation.service', () => ({
  FollowUpAutomationService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/proxy-rotation/service/proxy-rotation.service', () => ({
  ProxyRotationService: jest.fn().mockImplementation(() => ({})),
}));

import { EcosystemRunExecutor } from '../../../../modules/shared/ecosystem-run.executor';

describe('EcosystemRunExecutor', () => {
  it('supports hunting ecosystem modules', () => {
    const ex = new EcosystemRunExecutor();
    expect(ex.supports('client-hunter')).toBe(true);
    expect(ex.supports('lead-scoring')).toBe(true);
    expect(ex.supports('outreach')).toBe(true);
    expect(ex.supports('titanis')).toBe(true);
    expect(ex.supports('follow-up-automation')).toBe(true);
    expect(ex.supports('proxy-rotation')).toBe(true);
    expect(ex.supports('forge')).toBe(true);
    expect(ex.supports('unknown-module')).toBe(false);
  });

  it('reports real execution enabled from config', () => {
    const ex = new EcosystemRunExecutor();
    expect(ex.isRealExecutionEnabled()).toBe(true);
  });
});

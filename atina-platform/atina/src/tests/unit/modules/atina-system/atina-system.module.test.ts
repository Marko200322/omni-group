import { AtinaSystemModule } from '../../../../modules/atina-system/atina-system.module';

// eslint-disable-next-line no-var
var atinaSystemRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/atina-system/repository/atina-system.repository', () => {
  atinaSystemRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    AtinaSystemRepository: jest.fn().mockImplementation(() => atinaSystemRepo),
  };
});

describe('AtinaSystemModule', () => {
  it('initialize registers routes', async () => {
    const m = new AtinaSystemModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});

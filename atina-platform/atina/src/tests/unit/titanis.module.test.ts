import { TitanisModule } from '../../modules/titanis/titanis.module';

// eslint-disable-next-line no-var
var titanisRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

describe('TitanisModule', () => {
  it('initialize registers routes', async () => {
    const m = new TitanisModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});

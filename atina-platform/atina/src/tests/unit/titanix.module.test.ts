import { TitanixModule } from '../../modules/titanix/titanix.module';

// eslint-disable-next-line no-var
var titanixRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  insertTask: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titanix/repository/titanix.repository', () => {
  titanixRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    insertTask: jest.fn(),
    insertRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    TitanixRepository: jest.fn().mockImplementation(() => titanixRepo),
  };
});

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

describe('TitanixModule', () => {
  it('initialize registers routes', async () => {
    const m = new TitanixModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('titanix');
  });
});

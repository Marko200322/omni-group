import { ForgeModule } from '../../modules/forge/forge.module';

// eslint-disable-next-line no-var
var forgeRepo: {
  findRecentRunByIdempotencyKey: jest.Mock;
  createRunAndUpdateWithIdempotency: jest.Mock;
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/forge/repository/forge.repository', () => {
  forgeRepo = {
    findRecentRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
    createRunAndUpdateWithIdempotency: jest.fn().mockResolvedValue({ row: { id: 'run-1' }, reused: false }),
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    ForgeRepository: jest.fn().mockImplementation(() => forgeRepo),
  };
});

describe('ForgeModule', () => {
  it('initialize registers routes', async () => {
    const m = new ForgeModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});

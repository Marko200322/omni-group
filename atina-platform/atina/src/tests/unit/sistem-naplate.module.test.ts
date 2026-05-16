import { SistemNaplateModule } from '../../modules/sistem-naplate/sistem-naplate.module';

// eslint-disable-next-line no-var
var sistemNaplateRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/sistem-naplate/repository/sistem-naplate.repository', () => {
  sistemNaplateRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [] }),
    create: jest.fn(),
    getOwned: jest.fn(),
    createRun: jest.fn(),
    updateAfterRun: jest.fn(),
  };
  return {
    SistemNaplateRepository: jest.fn().mockImplementation(() => sistemNaplateRepo),
  };
});

describe('SistemNaplateModule', () => {
  it('initialize registers routes', async () => {
    const m = new SistemNaplateModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('sistem-naplate');
  });
});

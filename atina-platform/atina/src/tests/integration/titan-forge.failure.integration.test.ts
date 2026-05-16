import { TitanForgeService } from '../../modules/forge/service/titan-forge.service';

type DbCallback<T> = (err: Error | null, row?: T) => void;

type MockDb = {
  run: jest.Mock<void, [string, unknown[], (err: Error | null) => void]>;
  get: jest.Mock<void, [string, unknown[], DbCallback<unknown>]>;
  all: jest.Mock<void, [string, unknown[], DbCallback<unknown[]>]>;
  close: jest.Mock<void, []>;
};

// eslint-disable-next-line no-var
var currentDbMock: MockDb;

jest.mock('sqlite3', () => ({
  __esModule: true,
  default: {
    Database: jest.fn(() => currentDbMock),
  },
}));

function createDbMock(remainingBudget = 40): MockDb {
  const run: MockDb['run'] = jest.fn((_sql, _params, cb) => cb(null));

  const get: MockDb['get'] = jest.fn((sql, _params, cb) => {
    if (sql.includes(`SELECT id FROM forge_budget`)) {
      cb(null, { id: 'main' });
      return;
    }
    if (sql.includes('COUNT(*) AS count FROM forge_events')) {
      cb(null, { count: 0 });
      return;
    }
    if (sql.includes('SELECT initial_rsd, remaining_rsd FROM forge_budget')) {
      cb(null, { initial_rsd: 4000, remaining_rsd: remainingBudget });
      return;
    }
    cb(null, undefined);
  });

  const all: MockDb['all'] = jest.fn((_sql, _params, cb) => cb(null, []));
  const close: MockDb['close'] = jest.fn();

  return { run, get, all, close };
}

describe('TitanForge failure paths integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws deterministic budget exceeded error and does not write events', async () => {
    currentDbMock = createDbMock(40);
    const service = new TitanForgeService('C:/tmp/test-forge-vault-budget.db');

    await expect(service.forge('smelt', 24)).rejects.toThrow(
      'Forge budget exceeded. Remaining 40 RSD, required 77 RSD.'
    );

    const eventInsertCalls = currentDbMock.run.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO forge_events')
    );
    const updateBudgetCalls = currentDbMock.run.mock.calls.filter(([sql]) =>
      sql.includes('UPDATE forge_budget')
    );
    expect(eventInsertCalls).toHaveLength(0);
    expect(updateBudgetCalls).toHaveLength(0);
    expect(currentDbMock.close).toHaveBeenCalledTimes(1);
  });

  it('fails a later forge run when budget is exhausted by earlier run', async () => {
    let eventCount = 0;
    let remainingBudget = 700;
    const run: MockDb['run'] = jest.fn((sql, _params, cb) => {
      if (sql.includes('INSERT INTO forge_events')) {
        eventCount += 1;
      } else if (sql.includes('UPDATE forge_budget')) {
        remainingBudget = 20;
      }
      cb(null);
    });
    const get: MockDb['get'] = jest.fn((sql, _params, cb) => {
      if (sql.includes(`SELECT id FROM forge_budget`)) {
        cb(null, { id: 'main' });
        return;
      }
      if (sql.includes('COUNT(*) AS count FROM forge_events')) {
        cb(null, { count: eventCount });
        return;
      }
      if (sql.includes('SELECT initial_rsd, remaining_rsd FROM forge_budget')) {
        cb(null, { initial_rsd: 4000, remaining_rsd: remainingBudget });
        return;
      }
      if (sql.includes('SELECT remaining_rsd FROM forge_budget')) {
        cb(null, { remaining_rsd: remainingBudget });
        return;
      }
      cb(null, undefined);
    });
    const all: MockDb['all'] = jest.fn((_sql, _params, cb) => cb(null, []));
    const close: MockDb['close'] = jest.fn();
    currentDbMock = { run, get, all, close };

    const service = new TitanForgeService('C:/tmp/test-forge-vault-budget-seq.db');

    await expect(service.forge('deploy', 100)).resolves.toMatchObject({
      provider: 'oracle',
      remainingBudgetRsd: 20,
    });
    await expect(service.forge('deploy', 100)).rejects.toThrow(
      'Forge budget exceeded. Remaining 20 RSD, required 816 RSD.'
    );

    const eventInsertCalls = currentDbMock.run.mock.calls.filter(([sql]) => sql.includes('INSERT INTO forge_events'));
    expect(eventInsertCalls).toHaveLength(1);
    expect(currentDbMock.close).toHaveBeenCalledTimes(2);
  });
});

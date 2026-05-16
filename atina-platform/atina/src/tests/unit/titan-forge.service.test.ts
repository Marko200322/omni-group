import logger from '../../utils/logger';
import { TitanForgeService } from '../../modules/forge/service/titan-forge.service';
import { PaymentError } from '../../utils/errors';

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

function createDbMock(options?: {
  failEventInsertTimes?: number;
  alwaysFailEventInsert?: boolean;
  failBudgetUpdateTimes?: number;
  /** First lookup for main budget row returns no row (exercises INSERT seed path in ensureSchema). */
  budgetMainMissingOnFirstLookup?: boolean;
  /** Rows returned for getStatus event listing query. */
  statusQueryEvents?: Array<{
    id: string;
    provider: string;
    event_type: string;
    cost_rsd: number;
    created_at: string;
  }>;
  /** First forge_events insert fails with message-only lock (no sqlite error code). */
  failFirstEventInsertMessageOnly?: boolean;
}): MockDb {
  let eventInsertAttempts = 0;
  let budgetUpdateAttempts = 0;
  let remainingBudget = 4000;

  const run: MockDb['run'] = jest.fn((sql, _params, cb) => {
    if (sql.includes('INSERT INTO forge_events')) {
      eventInsertAttempts += 1;
      if (options?.alwaysFailEventInsert) {
        cb(Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' }));
        return;
      }
      if (eventInsertAttempts <= (options?.failEventInsertTimes ?? 0)) {
        cb(Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' }));
        return;
      }
    }
    if (sql.includes('UPDATE forge_budget')) {
      budgetUpdateAttempts += 1;
      if (budgetUpdateAttempts <= (options?.failBudgetUpdateTimes ?? 0)) {
        cb(Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' }));
        return;
      }
      remainingBudget -= 77;
    }
    cb(null);
  });

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
    if (sql.includes('SELECT remaining_rsd FROM forge_budget')) {
      cb(null, { remaining_rsd: remainingBudget });
      return;
    }
    cb(null, undefined);
  });

  const all: MockDb['all'] = jest.fn((_sql, _params, cb) => cb(null, []));
  const close: MockDb['close'] = jest.fn();

  return { run, get, all, close };
}

describe('TitanForgeService SQLite write retries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries transient SQLite write failures and succeeds', async () => {
    currentDbMock = createDbMock({ failEventInsertTimes: 1 });
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db');

    const result = await service.forge('smelt', 24);

    expect(result.provider).toBe('oracle');
    const eventInsertCalls = currentDbMock.run.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO forge_events')
    );
    expect(eventInsertCalls).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'Transient SQLite write error in TitanForgeService, retrying',
      expect.objectContaining({
        attempt: 1,
        maxRetries: 3,
        code: 'SQLITE_BUSY',
      })
    );
  });

  it('caps retries for transient SQLite write failures and throws', async () => {
    currentDbMock = createDbMock({ alwaysFailEventInsert: true });
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db');

    await expect(service.forge('smelt', 24)).rejects.toThrow('database is locked');

    const eventInsertCalls = currentDbMock.run.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO forge_events')
    );
    expect(eventInsertCalls).toHaveLength(4);
    expect(logger.warn).toHaveBeenCalledWith(
      'SQLite write failed in TitanForgeService',
      expect.objectContaining({
        attempt: 4,
        maxRetries: 3,
        transient: true,
        code: 'SQLITE_BUSY',
      })
    );
  });

  it('retries budget update write and spends once after retry', async () => {
    currentDbMock = createDbMock({ failBudgetUpdateTimes: 1 });
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db');

    const result = await service.forge('smelt', 24);

    expect(result.remainingBudgetRsd).toBe(3923);
    const updateBudgetCalls = currentDbMock.run.mock.calls.filter(([sql]) => sql.includes('UPDATE forge_budget'));
    expect(updateBudgetCalls).toHaveLength(2);
  });

  it('enforces min reserve when hard-stop mode is enabled', async () => {
    currentDbMock = createDbMock();
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db', {
      minReserveRsd: 3990,
      hardStopMode: true,
    });

    try {
      await service.forge('smelt', 24);
      throw new Error('Expected forge to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentError);
      expect((error as Error).message).toContain('Forge reserve guard blocked spend');
    }
  });

  it('does not block below reserve when hard-stop mode is disabled', async () => {
    currentDbMock = createDbMock();
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db', {
      minReserveRsd: 3990,
      hardStopMode: false,
    });

    const result = await service.forge('smelt', 24);
    expect(result.provider).toBe('oracle');
  });

  it('throws PaymentError when remaining budget is lower than cost', async () => {
    currentDbMock = createDbMock();
    const getOriginal = currentDbMock.get;
    currentDbMock.get = jest.fn((sql, params, cb) => {
      if (sql.includes('SELECT initial_rsd, remaining_rsd FROM forge_budget')) {
        cb(null, { initial_rsd: 4000, remaining_rsd: 70 });
        return;
      }
      return getOriginal(sql, params, cb);
    });
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db');

    try {
      await service.forge('smelt', 24);
      throw new Error('Expected forge to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentError);
      expect((error as Error).message).toBe('Forge budget exceeded. Remaining 70 RSD, required 77 RSD.');
    }
  });

  it('allows spending exactly available amount at reserve threshold', async () => {
    currentDbMock = createDbMock();
    const getOriginal = currentDbMock.get;
    currentDbMock.get = jest.fn((sql, params, cb) => {
      if (sql.includes('SELECT initial_rsd, remaining_rsd FROM forge_budget')) {
        cb(null, { initial_rsd: 4000, remaining_rsd: 577 });
        return;
      }
      if (sql.includes('SELECT remaining_rsd FROM forge_budget')) {
        cb(null, { remaining_rsd: 500 });
        return;
      }
      return getOriginal(sql, params, cb);
    });
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db', {
      minReserveRsd: 500,
      hardStopMode: true,
    });

    const result = await service.forge('smelt', 24);
    expect(result.remainingBudgetRsd).toBe(500);
  });

  it('returns budget guard details in status', async () => {
    currentDbMock = createDbMock();
    const service = new TitanForgeService('C:/tmp/test-forge-vault.db', {
      minReserveRsd: 500,
      hardStopMode: true,
    });

    const status = await service.getStatus();
    expect(status.budgetGuard).toEqual({
      minReserveRsd: 500,
      hardStopMode: true,
      availableToSpendRsd: 3500,
    });
  });
});

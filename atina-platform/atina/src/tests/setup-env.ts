const runnerEnvSnapshot = { ...process.env };
const runnerPreserveKeys = ['CI','GITHUB_ACTIONS','RUNNER_OS','PATH','HOME','USER','TEMP','TMP','NODE_OPTIONS'] as const;
afterEach(() => { for (const key of runnerPreserveKeys) { const v = runnerEnvSnapshot[key]; if (v !== undefined) process.env[key] = v; } });

// Bull/Redis is not available in unit tests on CI; avoid connection hangs on queue.add().
jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
  })),
}));

// sqlite3 ships prebuilt linux binaries (GLIBC 2.38+). Unit tests that transitively import
// titan-forge must not load the native addon on CI/Linux runners. Dedicated forge tests
// override this mock in-file (jest.mock hoisted per test file).
jest.mock('sqlite3', () => ({
  __esModule: true,
  default: {
    Database: jest.fn(function MockSqliteDatabase() {
      return {
        run: jest.fn((_sql: string, _params: unknown, cb?: (err: Error | null) => void) => {
          cb?.(null);
        }),
        get: jest.fn(
          (_sql: string, _params: unknown, cb?: (err: Error | null, row?: unknown) => void) => {
            cb?.(null, {});
          }
        ),
        all: jest.fn(
          (_sql: string, _params: unknown, cb?: (err: Error | null, rows?: unknown[]) => void) => {
            cb?.(null, []);
          }
        ),
        close: jest.fn(),
      };
    }),
  },
}));

jest.mock('../utils/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), log: jest.fn(), close: jest.fn() } }));
afterAll(async () => {
  type Q = { closeAllQueues?: () => Promise<void> }; type D = { closePool?: () => Promise<void> }; type R = { moduleRegistry?: { shutdownAll?: () => Promise<void>; resetForTests?: () => void } };
  const q: Q = await import('../queue/queue').catch(() => ({})); const d: D = await import('../database/connection').catch(() => ({})); const r: R = await import('../core/ModuleRegistry').catch(() => ({}));
  await Promise.allSettled([(typeof q.closeAllQueues === 'function' ? q.closeAllQueues() : Promise.resolve()), (typeof d.closePool === 'function' ? d.closePool() : Promise.resolve()), (typeof r.moduleRegistry?.shutdownAll === 'function' ? r.moduleRegistry.shutdownAll() : Promise.resolve())]);
  r.moduleRegistry?.resetForTests?.();
});

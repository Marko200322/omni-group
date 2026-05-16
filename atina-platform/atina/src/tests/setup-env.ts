/**
 * Avoid Winston file transports during tests (open FDs keep Jest alive).
 */
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    close: jest.fn(),
  },
}));

afterAll(async () => {
  // Ensure no global resources keep Jest alive across files.
  // Import each teardown target separately: connection.ts instantiates Pool at load time
  // and fails if `config.database` is unset (e.g. single-file Jest runs).
  type QueueTeardown = { closeAllQueues?: () => Promise<void> };
  type DbTeardown = { closePool?: () => Promise<void> };
  type RegistryTeardown = { moduleRegistry?: { shutdownAll?: () => Promise<void>; resetForTests?: () => void } };

  const queueModule: QueueTeardown = await import('../queue/queue').catch(() => ({}));
  const dbModule: DbTeardown = await import('../database/connection').catch(() => ({}));
  const registryModule: RegistryTeardown = await import('../core/ModuleRegistry').catch(() => ({}));

  const closeAllQueues = typeof queueModule.closeAllQueues === 'function'
    ? queueModule.closeAllQueues()
    : Promise.resolve();
  const closePool = typeof dbModule.closePool === 'function'
    ? dbModule.closePool()
    : Promise.resolve();
  const shutdownModules = typeof registryModule.moduleRegistry?.shutdownAll === 'function'
    ? registryModule.moduleRegistry.shutdownAll()
    : Promise.resolve();

  await Promise.allSettled([closeAllQueues, closePool, shutdownModules]);
  registryModule.moduleRegistry?.resetForTests?.();
});

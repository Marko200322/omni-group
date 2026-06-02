const runnerEnvSnapshot = { ...process.env };
const runnerPreserveKeys = ['CI','GITHUB_ACTIONS','RUNNER_OS','PATH','HOME','USER','TEMP','TMP','NODE_OPTIONS'] as const;
afterEach(() => { for (const key of runnerPreserveKeys) { const v = runnerEnvSnapshot[key]; if (v !== undefined) process.env[key] = v; } });
jest.mock('../utils/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), log: jest.fn(), close: jest.fn() } }));
afterAll(async () => {
  type Q = { closeAllQueues?: () => Promise<void> }; type D = { closePool?: () => Promise<void> }; type R = { moduleRegistry?: { shutdownAll?: () => Promise<void>; resetForTests?: () => void } };
  const q: Q = await import('../queue/queue').catch(() => ({})); const d: D = await import('../database/connection').catch(() => ({})); const r: R = await import('../core/ModuleRegistry').catch(() => ({}));
  await Promise.allSettled([(typeof q.closeAllQueues === 'function' ? q.closeAllQueues() : Promise.resolve()), (typeof d.closePool === 'function' ? d.closePool() : Promise.resolve()), (typeof r.moduleRegistry?.shutdownAll === 'function' ? r.moduleRegistry.shutdownAll() : Promise.resolve())]);
  r.moduleRegistry?.resetForTests?.();
});

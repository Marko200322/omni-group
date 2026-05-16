jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((name: string, opts: Record<string, unknown>) => {
    const listeners = new Map<string, Array<(a?: unknown, b?: unknown) => void>>();
    type MockQueue = {
      name: string;
      opts: Record<string, unknown>;
      add: jest.Mock;
      close: jest.Mock;
      on: (event: string, handler: (a?: unknown, b?: unknown) => void) => MockQueue;
      emit: (event: string, a?: unknown, b?: unknown) => void;
    };
    const q: MockQueue = {
      name,
      opts,
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
      close: jest.fn().mockResolvedValue(undefined),
      on(event: string, handler: (a?: unknown, b?: unknown) => void): MockQueue {
        const arr = listeners.get(event) ?? [];
        arr.push(handler);
        listeners.set(event, arr);
        return q;
      },
      /** Test helper: trigger Bull event listeners (error / failed / completed). */
      emit(event: string, a?: unknown, b?: unknown): void {
        for (const h of listeners.get(event) ?? []) h(a, b);
      },
    };
    return q;
  }),
}));

import Bull from 'bull';
import { InMemoryQueue } from '../../queue/queue';
import logger from '../../utils/logger';

type QueueModule = typeof import('../../queue/queue');

function loadQueueModuleFresh(): QueueModule {
  let mod!: QueueModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../queue/queue') as QueueModule;
  });
  return mod;
}

describe('queue (Bull mocked)', () => {
  const BullMock = Bull as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createQueue passes redis options from config and registers event listeners', async () => {
    const { getQueue } = loadQueueModuleFresh();
    const q = getQueue('tasks');

    expect(BullMock).toHaveBeenCalledWith(
      'tasks',
      expect.objectContaining({
        redis: expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          db: expect.any(Number),
        }),
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }),
      }),
    );

    const ctorOpts = BullMock.mock.calls[0]?.[1] as { redis?: { host: string; port: number; db: number; password?: string } };
    expect(ctorOpts.redis).toMatchObject({
      host: expect.any(String),
      port: expect.any(Number),
      db: expect.any(Number),
    });
    if (process.env.REDIS_PASSWORD === undefined || process.env.REDIS_PASSWORD === '') {
      expect(ctorOpts.redis?.password).toBeUndefined();
    }

    (q as { emit: (e: string, a?: unknown, b?: unknown) => void }).emit('error', new Error('redis down'));
    expect(logger.error).toHaveBeenCalled();

    (q as { emit: (e: string, a?: unknown, b?: unknown) => void }).emit('failed', { id: '1' }, new Error('boom'));
    expect(logger.warn).toHaveBeenCalled();

    (q as { emit: (e: string, a?: unknown, b?: unknown) => void }).emit('completed', { id: '2' });
    expect(logger.debug).toHaveBeenCalled();
  });

  it('getQueue reuses the same Bull instance per logical queue name', () => {
    const { getQueue } = loadQueueModuleFresh();
    const a = getQueue('emails');
    const b = getQueue('emails');
    expect(a).toBe(b);
    expect(BullMock).toHaveBeenCalledTimes(1);
  });

  it('addJob delegates to queue.add with data and opts', async () => {
    const { getQueue, addJob } = loadQueueModuleFresh();
    const q = getQueue('scraper');
    const payload = { x: 1 };
    await addJob('scraper', payload, { priority: 1 });

    expect((q as unknown as { add: jest.Mock }).add).toHaveBeenCalledWith(payload, { priority: 1 });
  });

  it('closeAllQueues closes each created queue and logs', async () => {
    const { getQueue, closeAllQueues } = loadQueueModuleFresh();
    getQueue('tasks');
    getQueue('emails');

    await closeAllQueues();

    const calls = BullMock.mock.results.map((r) => r.value as { close: jest.Mock });
    for (const inst of calls) {
      expect(inst.close).toHaveBeenCalledTimes(1);
    }
    expect(logger.info).toHaveBeenCalled();
  });
});

describe('InMemoryQueue', () => {
  async function flushMicrotasks(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  it('runs registered handler on add and completes', async () => {
    const q = new InMemoryQueue();
    const handler = jest.fn().mockResolvedValue(undefined);
    q.on('work', handler);
    const jobId = await q.add('work', { n: 1 });
    await flushMicrotasks();

    expect(handler).toHaveBeenCalledWith({ n: 1 });
    expect(q.getStatus(jobId)?.status).toBe('completed');
  });

  it('marks job completed and getStatus reflects final state', async () => {
    const q = new InMemoryQueue();
    q.on('t', jest.fn(async () => undefined));
    const jobId = await q.add('t', { ok: true });
    await flushMicrotasks();

    const st = q.getStatus(jobId);
    expect(st?.status).toBe('completed');
  });

  it('marks failed when no handler is registered', async () => {
    const q = new InMemoryQueue();
    const jobId = await q.add('unknown', {});
    await flushMicrotasks();

    expect(q.getStatus(jobId)?.status).toBe('failed');
  });

  it('retries up to 3 attempts then marks failed when handler keeps rejecting', async () => {
    const pendingRetries: Array<() => void> = [];
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      if (typeof fn === 'function') pendingRetries.push(fn);
      return 0 as unknown as NodeJS.Timeout;
    });

    try {
      const q = new InMemoryQueue();
      const handler = jest.fn().mockRejectedValue(new Error('always fail'));
      q.on('t', handler);
      const jobId = await q.add('t', { v: 1 });
      await flushMicrotasks();

      while (pendingRetries.length > 0) {
        pendingRetries.shift()?.();
        await flushMicrotasks();
      }

      expect(handler).toHaveBeenCalledTimes(3);
      expect(q.getStatus(jobId)?.status).toBe('failed');
    } finally {
      spy.mockRestore();
    }
  });

  it('recovers after rejection when handler later resolves', async () => {
    const pendingRetries: Array<() => void> = [];
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      if (typeof fn === 'function') pendingRetries.push(fn);
      return 0 as unknown as NodeJS.Timeout;
    });
    try {
      const q = new InMemoryQueue();
      const handler = jest.fn().mockRejectedValueOnce(new Error('once')).mockResolvedValueOnce(undefined);
      q.on('t', handler);

      const jobId = await q.add('t', {});
      await flushMicrotasks();
      expect(q.getStatus(jobId)?.status).toBe('retrying');
      expect(pendingRetries).toHaveLength(1);

      pendingRetries.shift()?.();
      await flushMicrotasks();

      expect(handler).toHaveBeenCalledTimes(2);
      expect(q.getStatus(jobId)?.status).toBe('completed');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns null from getStatus for unknown id', () => {
    expect(new InMemoryQueue().getStatus('nope')).toBeNull();
  });
});

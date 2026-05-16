import { TasksModule } from '../../modules/tasks/tasks.module';
import * as db from '../../database/connection';
import * as queue from '../../queue/queue';
import logger from '../../utils/logger';

jest.mock('../../database/connection');
jest.mock('../../queue/queue');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockGetQueue = queue.getQueue as jest.MockedFunction<typeof queue.getQueue>;

describe('TasksModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('initialize registers routes when worker starts', async () => {
    const processMock = jest.fn();
    mockGetQueue.mockReturnValue({ process: processMock } as never);

    const m = new TasksModule();
    await m.initialize();

    expect(m.router).toBeDefined();
    expect(processMock).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Task worker initialized');
  });

  it('initialize warns when queue cannot start', async () => {
    mockGetQueue.mockImplementation(() => {
      throw new Error('no redis');
    });

    const m = new TasksModule();
    await m.initialize();

    expect(logger.warn).toHaveBeenCalledWith(
      'Task worker could not start (Redis may not be available)',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  describe('task worker handler', () => {
    let worker: (job: {
      data: { taskId: string; type: string; payload: Record<string, unknown> };
      attemptsMade: number;
      opts: { attempts?: number };
    }) => Promise<void>;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    beforeEach(async () => {
      mockGetQueue.mockImplementation(() => ({
        process: (fn: typeof worker) => {
          worker = fn;
        },
      }) as never);

      const m = new TasksModule();
      await m.initialize();
      mockQuery.mockReset();
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
    });

    const job = (
      type: string,
      payload: Record<string, unknown>,
      attemptsMade = 0,
      attempts?: number
    ) => ({
      data: { taskId: 'tid', type, payload },
      attemptsMade,
      opts: attempts === undefined ? {} : { attempts },
    });

    it('send_email completes', async () => {
      await worker(job('send_email', { to: 'a@b.com', subject: 'Hi' }));
      expect(mockQuery).toHaveBeenCalled();
      const secondArgs = mockQuery.mock.calls.map((c) => c[1] as unknown[]);
      expect(secondArgs.some((a) => a[1] === 'running')).toBe(true);
      expect(secondArgs.some((a) => a[1] === 'completed')).toBe(true);
    });

    it('scrape_url, export_data, generate_report and default type', async () => {
      await worker(job('scrape_url', { url: 'https://x.com' }));
      await worker(job('export_data', { format: 'csv' }));
      await worker(job('generate_report', {}));
      await worker(job('custom_type', { a: 1 }));
      expect(mockQuery.mock.calls.length).toBeGreaterThan(4);
    });

    it('on failure retries when not last attempt', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const err = new Error('transient');
      const proto = TasksModule.prototype as unknown as { executeTask: () => Promise<unknown> };
      const execSpy = jest.spyOn(proto, 'executeTask').mockRejectedValueOnce(err);

      await expect(worker(job('send_email', {}, 0, 3))).rejects.toBe(err);
      const args = mockQuery.mock.calls.map((c) => c[1] as unknown[]);
      expect(args.some((a) => a[1] === 'retrying')).toBe(true);

      execSpy.mockRestore();
    });

    it('on failure marks failed on last attempt', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const proto = TasksModule.prototype as unknown as { executeTask: () => Promise<unknown> };
      jest.spyOn(proto, 'executeTask').mockRejectedValueOnce(new Error('fatal'));

      await worker(job('send_email', {}, 2, 3));

      const failedCall = mockQuery.mock.calls.find((c) => (c[1] as unknown[])[1] === 'failed');
      expect(failedCall?.[1]).toEqual(['tid', 'failed', 'fatal']);
    });

    it('uses default attempts (3) when job.opts.attempts is omitted', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const proto = TasksModule.prototype as unknown as { executeTask: () => Promise<unknown> };
      const spy = jest.spyOn(proto, 'executeTask').mockRejectedValue(new Error('e'));

      await expect(worker(job('send_email', {}, 1))).rejects.toThrow('e');
      expect(
        mockQuery.mock.calls.map((c) => c[1] as unknown[]).some((a) => a[1] === 'retrying')
      ).toBe(true);

      mockQuery.mockClear();
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await worker(job('send_email', {}, 2));

      const failedCall = mockQuery.mock.calls.find((c) => (c[1] as unknown[])[1] === 'failed');
      expect(failedCall?.[1]).toEqual(['tid', 'failed', 'e']);

      spy.mockRestore();
    });

    it('respects custom job.opts.attempts for last-attempt boundary', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const proto = TasksModule.prototype as unknown as { executeTask: () => Promise<unknown> };
      const spy = jest.spyOn(proto, 'executeTask').mockRejectedValue(new Error('e'));

      await expect(worker(job('send_email', {}, 3, 5))).rejects.toThrow('e');
      expect(
        mockQuery.mock.calls.map((c) => c[1] as unknown[]).some((a) => a[1] === 'retrying')
      ).toBe(true);

      mockQuery.mockClear();
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await worker(job('send_email', {}, 4, 5));

      const failedCall = mockQuery.mock.calls.find((c) => (c[1] as unknown[])[1] === 'failed');
      expect(failedCall?.[1]).toEqual(['tid', 'failed', 'e']);

      spy.mockRestore();
    });
  });
});

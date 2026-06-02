import { TasksModule } from '../../modules/tasks/tasks.module';
import * as taskExecution from '../../modules/tasks/execute-task-by-type';
import * as db from '../../database/connection';
import * as queue from '../../queue/queue';
import logger from '../../utils/logger';

jest.mock('../../database/connection');
jest.mock('../../queue/queue');
jest.mock('../../queue/register-workers', () => ({
  registerAuxiliaryQueueWorkers: jest.fn(),
}));
jest.mock('../../modules/tasks/task-executors', () => ({
  executeScrapeUrl: jest.fn().mockResolvedValue({ status: 'scraped', url: 'https://x.com', fallback: true, data: {} }),
  executeTitanixPipeline: jest.fn().mockResolvedValue({ status: 'completed' }),
  executeOmnitubePipeline: jest.fn().mockResolvedValue({ status: 'queued', jobId: 'yt-1' }),
  executeOmnigameValidate: jest.fn().mockResolvedValue({ validation_score: 80 }),
}));

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

    it('omnitube_pipeline and omnigame_validate task types', async () => {
      await worker(job('titanix_pipeline', { pipeline: 'p1' }));
      await worker(job('omnitube_pipeline', { systemId: 's1' }));
      await worker(job('omnigame_validate', { genre: 'indie' }));
      const completed = mockQuery.mock.calls.map((c) => (c[1] as unknown[])[1]);
      expect(completed.filter((s) => s === 'completed').length).toBeGreaterThanOrEqual(3);
    });

    it('on failure retries when not last attempt', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const err = new Error('transient');
      const execSpy = jest.spyOn(taskExecution, 'executeTaskByType').mockRejectedValueOnce(err);

      await expect(worker(job('send_email', {}, 0, 3))).rejects.toBe(err);
      const args = mockQuery.mock.calls.map((c) => c[1] as unknown[]);
      expect(args.some((a) => a[1] === 'retrying')).toBe(true);

      execSpy.mockRestore();
    });

    it('on failure marks failed on last attempt', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      jest.spyOn(taskExecution, 'executeTaskByType').mockRejectedValueOnce(new Error('fatal'));

      await worker(job('send_email', {}, 2, 3));

      const failedCall = mockQuery.mock.calls.find((c) => (c[1] as unknown[])[1] === 'failed');
      expect(failedCall?.[1]).toEqual(['tid', 'failed', 'fatal']);
    });

    it('uses default attempts (3) when job.opts.attempts is omitted', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const spy = jest.spyOn(taskExecution, 'executeTaskByType').mockRejectedValue(new Error('e'));

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
      const spy = jest.spyOn(taskExecution, 'executeTaskByType').mockRejectedValue(new Error('e'));

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

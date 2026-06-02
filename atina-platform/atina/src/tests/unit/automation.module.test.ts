import logger from '../../utils/logger';
import { AutomationModule } from '../../modules/automation/automation.module';
import * as db from '../../database/connection';
import * as queue from '../../queue/queue';

jest.mock('../../database/connection');
jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockAddJob = queue.addJob as jest.MockedFunction<typeof queue.addJob>;

describe('AutomationModule', () => {
  let setIntervalSpy: jest.SpyInstance;
  let intervalTick: (() => void | Promise<void>) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    intervalTick = undefined;
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(((fn: () => void) => {
      intervalTick = fn;
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setInterval);
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
  });

  function remockSetInterval(capture: (fn: () => void) => NodeJS.Timeout) {
    setIntervalSpy.mockRestore();
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(
      ((fn: () => void) => capture(fn)) as typeof setInterval
    );
  }

  it('initialize clears previous scheduler when interval handle is truthy', async () => {
    const clearSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    let tick: (() => void | Promise<void>) | undefined;
    let seq = 0;
    try {
      remockSetInterval((fn) => {
        tick = fn;
        seq += 1;
        return seq as unknown as NodeJS.Timeout;
      });

      const m = new AutomationModule();
      await m.initialize();
      const first = seq;
      await m.initialize();

      expect(clearSpy).toHaveBeenCalledWith(first as unknown as NodeJS.Timeout);
      expect(tick).toBeDefined();
    } finally {
      clearSpy.mockRestore();
      remockSetInterval((fn) => {
        intervalTick = fn;
        return 0 as unknown as NodeJS.Timeout;
      });
    }
  });

  it('shutdown clears scheduler interval and nulls handle', async () => {
    const clearSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
    const handle = { tag: 't' } as unknown as NodeJS.Timeout;
    try {
      remockSetInterval((fn) => {
        intervalTick = fn;
        return handle;
      });

      const m = new AutomationModule();
      await m.initialize();
      await m.shutdown();

      expect(clearSpy).toHaveBeenCalledWith(handle);
      expect((m as unknown as { schedulerInterval: NodeJS.Timeout | null }).schedulerInterval).toBeNull();
    } finally {
      clearSpy.mockRestore();
      remockSetInterval((fn) => {
        intervalTick = fn;
        return 0 as unknown as NodeJS.Timeout;
      });
    }
  });

  it('initialize registers routes and schedules automation tick', async () => {
    const m = new AutomationModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    expect(intervalTick).toBeDefined();
  });

  it('scheduler enqueues pending automation_workflow tasks', async () => {
    const m = new AutomationModule();
    await m.initialize();

    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'pend1', payload: { workflowId: 'wf-9' } }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    (intervalTick as () => void)();
    await new Promise<void>((r) => setImmediate(r));

    expect(mockAddJob).toHaveBeenCalledWith(
      'automation',
      { taskId: 'pend1', workflowId: 'wf-9' },
      {}
    );
    expect(mockQuery.mock.calls[1][0]).toContain('queued');
  });

  it('scheduler logs when query fails', async () => {
    const m = new AutomationModule();
    await m.initialize();

    mockQuery.mockRejectedValueOnce(new Error('scheduler db'));

    (intervalTick as () => void)();
    await new Promise<void>((r) => setImmediate(r));

    expect(logger.error).toHaveBeenCalledWith(
      'Automation scheduler error',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('executeWorkflow uses default context when second arg omitted', async () => {
    const m = new AutomationModule();
    await m.initialize();

    const run = (m as unknown as { executeWorkflow: (w: { steps: unknown[] }) => Promise<unknown> })
      .executeWorkflow;

    const out = (await run.call(m, {
      steps: [{ id: 'w0', type: 'wait', config: {} }],
    })) as Record<string, unknown>;

    expect(out.w0).toEqual({ waited: true, duration: undefined });
  });

  it('shutdown without initialize does not throw', async () => {
    const m = new AutomationModule();
    await expect(m.shutdown()).resolves.toBeUndefined();
  });

  it('executeWorkflow records non-Error step failures as string messages', async () => {
    const m = new AutomationModule();
    await m.initialize();

    mockQuery.mockRejectedValueOnce('not an Error object');

    const run = (m as unknown as { executeWorkflow: (w: { steps: unknown[] }) => Promise<unknown> })
      .executeWorkflow;

    const out = (await run.call(m, {
      steps: [{ id: 'n1', type: 'notify', config: { title: 't', message: 'm' } }],
    })) as Record<string, unknown>;

    expect(out.n1).toEqual({ error: 'not an Error object' });
    expect(logger.warn).toHaveBeenCalledWith(
      'Workflow step failed: n1',
      expect.objectContaining({ error: 'not an Error object' })
    );
  });
});

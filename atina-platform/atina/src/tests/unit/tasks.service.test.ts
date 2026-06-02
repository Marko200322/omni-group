import * as db from '../../database/connection';
import logger from '../../utils/logger';
import { TasksService } from '../../modules/tasks/service/tasks.service';
import { NotFoundError, PlanLimitError } from '../../utils/errors';

jest.mock('../../database/connection');
jest.mock('../../queue/queue', () => ({
  addJob: jest.fn(),
  getQueue: jest.fn(),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockAddJob = jest.requireMock('../../queue/queue').addJob as jest.Mock;

const taskRow = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'task-1',
    user_id: 'u1',
    type: 'send_email',
    name: 'n',
    description: null,
    status: 'pending',
    priority: 5,
    payload: {},
    result: null,
    error_message: null,
    attempts: 0,
    max_attempts: 3,
    scheduled_at: null,
    started_at: null,
    completed_at: null,
    created_at: new Date(),
    ...over,
  }) as import('../../modules/tasks/service/tasks.service').Task;

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddJob.mockResolvedValue({ id: 'job-1' } as never);
    service = new TasksService();
  });

  describe('createTask', () => {
    it('queues when no schedule and plan has unlimited tasks', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: -1 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const t = await service.createTask('u1', { type: 'send_email', name: 'Mail' });

      expect(t.id).toBe('task-1');
      expect(mockAddJob).toHaveBeenCalled();
    });

    it('throws PlanLimitError when monthly count at cap', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: 2 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as never);

      await expect(
        service.createTask('u1', { type: 't', name: 'n' })
      ).rejects.toBeInstanceOf(PlanLimitError);
    });

    it('allows create when under limit', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: 10 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.createTask('u1', { type: 't', name: 'n' });
      expect(mockAddJob).toHaveBeenCalled();
    });

    it('uses empty limits when plan row has no limits field', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{}], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never);

      await expect(service.createTask('u1', { type: 't', name: 'n' })).rejects.toBeInstanceOf(PlanLimitError);
    });

    it('uses zero cap when tasks_per_month missing in limits object', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { other: 1 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never);

      await expect(service.createTask('u1', { type: 't', name: 'n' })).rejects.toBeInstanceOf(PlanLimitError);
    });

    it('does not queue when scheduledAt set', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: -1 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never);

      await service.createTask('u1', {
        type: 't',
        name: 'n',
        scheduledAt: '2027-06-01T12:00:00.000Z',
      });

      expect(mockAddJob).not.toHaveBeenCalled();
    });

    it('uses defaults for optional fields', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: -1 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.createTask('u1', { type: 't', name: 'n' });

      const insertCall = mockQuery.mock.calls.find((c) => String(c[0]).includes('INSERT INTO tasks'));
      expect(insertCall?.[1]).toEqual(
        expect.arrayContaining(['u1', 't', 'n', null, 5, '{}', null, 3])
      );
    });

    it('logs when queue fails after insert', async () => {
      mockAddJob.mockRejectedValueOnce(new Error('queue down'));
      mockQuery
        .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: -1 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never);

      await service.createTask('u1', { type: 't', name: 'n' });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to queue task',
        expect.objectContaining({ taskId: 'task-1' })
      );
    });
  });

  describe('listTasks', () => {
    it('filters by status and type', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never);

      const out = await service.listTasks('u1', {
        page: 2,
        limit: 5,
        status: 'queued',
        type: 'send_email',
      });

      expect(out.total).toBe(1);
      expect(mockQuery.mock.calls[0][0]).toContain('status = $2');
      expect(mockQuery.mock.calls[0][0]).toContain('type = $3');
    });

    it('omits status and type filters when unset', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await service.listTasks('u1', { page: 1, limit: 10 });

      expect(mockQuery.mock.calls[0][0]).not.toContain('status =');
      expect(mockQuery.mock.calls[0][0]).not.toContain('type =');
    });
  });

  describe('getTask', () => {
    it('returns row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [taskRow()], rowCount: 1 } as never);
      await expect(service.getTask('task-1', 'u1')).resolves.toMatchObject({ id: 'task-1' });
    });

    it('throws NotFoundError', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(service.getTask('x', 'u1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('cancelTask', () => {
    it('throws when no row updated', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] } as never);
      await expect(service.cancelTask('t', 'u1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('resolves when canceled', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] } as never);
      await expect(service.cancelTask('t', 'u1')).resolves.toBeUndefined();
    });
  });

  describe('retryTask', () => {
    it('throws NotFoundError when task id unknown', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(service.retryTask('00000000-0000-4000-8000-000000000001', 'u1')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it('throws when task not failed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [taskRow({ status: 'completed' })], rowCount: 1 } as never);
      await expect(service.retryTask('t', 'u1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('resets and requeues failed task', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [taskRow({ status: 'failed' })], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.retryTask('task-1', 'u1');

      expect(mockAddJob).toHaveBeenCalled();
    });

    it('logs when requeue fails after reset', async () => {
      mockAddJob.mockRejectedValueOnce(new Error('queue down'));
      mockQuery
        .mockResolvedValueOnce({ rows: [taskRow({ status: 'failed' })], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.retryTask('task-1', 'u1');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to queue task',
        expect.objectContaining({ taskId: 'task-1' })
      );
    });
  });

  describe('updateTaskStatus', () => {
    it('sets running fields', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'running');
      expect(mockQuery.mock.calls[0][0]).toContain('started_at = NOW()');
      expect(mockQuery.mock.calls[0][0]).toContain('attempts = attempts + 1');
    });

    it('sets completed with result', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'completed', { ok: true });
      expect(mockQuery.mock.calls[0][0]).toContain('completed_at = NOW()');
      expect(mockQuery.mock.calls[0][1]).toContainEqual(expect.any(String));
    });

    it('completed without result omits result column', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'completed');
      expect(mockQuery.mock.calls[0][0]).not.toContain('result =');
    });

    it('failed with error message', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'failed', undefined, 'boom');
      expect(mockQuery.mock.calls[0][0]).toContain('error_message');
    });

    it('failed without error message omits error_message column', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'failed');
      expect(mockQuery.mock.calls[0][0]).not.toContain('error_message');
    });

    it('other status minimal update', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);
      await service.updateTaskStatus('t1', 'retrying');
      expect(mockQuery.mock.calls[0][0]).toContain("status = $2");
    });
  });

  describe('getAdminStats', () => {
    it('aggregates counts', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '42' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({
          rows: [
            { status: 'pending', count: '10' },
            { status: 'completed', count: '32' },
          ],
          rowCount: 2,
        } as never)
        .mockResolvedValueOnce({
          rows: [{ type: 'send_email', count: '40' }],
          rowCount: 1,
        } as never);

      const stats = await service.getAdminStats();

      expect(stats.total).toBe(42);
      expect(stats.byStatus.pending).toBe(10);
      expect(stats.byType[0]).toEqual({ type: 'send_email', count: 40 });
    });
  });
});

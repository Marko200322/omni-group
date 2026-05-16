import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError, AuthorizationError, NotFoundError, PlanLimitError } from '../../utils/errors';

// eslint-disable-next-line no-var
var taskServiceMock: {
  createTask: jest.Mock;
  listTasks: jest.Mock;
  getTask: jest.Mock;
  cancelTask: jest.Mock;
  retryTask: jest.Mock;
  getAdminStats: jest.Mock;
};

jest.mock('../../modules/tasks/service/tasks.service', () => {
  taskServiceMock = {
    createTask: jest.fn(),
    listTasks: jest.fn(),
    getTask: jest.fn(),
    cancelTask: jest.fn(),
    retryTask: jest.fn(),
    getAdminStats: jest.fn(),
  };
  return {
    TasksService: jest.fn().mockImplementation(() => taskServiceMock),
  };
});

jest.mock('../../queue/queue', () => ({
  getQueue: jest.fn(() => ({ process: jest.fn() })),
  addJob: jest.fn(),
}));

let tasksAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!tasksAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'user';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role,
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const u = (req as express.Request & { user?: { role: string } }).user;
    if (u?.role !== 'admin') {
      return next(new AuthorizationError());
    }
    next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('TasksModule HTTP routes', () => {
  let server: http.Server;
  const taskId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const expectExactObjectKeys = (value: Record<string, unknown>, expectedKeys: string[]) => {
    expect(Object.keys(value).sort()).toEqual([...expectedKeys].sort());
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TasksModule();
    await m.initialize();
    app.use('/tasks', m.router);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500);
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    tasksAuthOn = true;
    jest.clearAllMocks();
    taskServiceMock.createTask.mockResolvedValue({ id: 't1' } as never);
    taskServiceMock.listTasks.mockResolvedValue({ tasks: [], total: 0 });
    taskServiceMock.getTask.mockResolvedValue({ id: 'tid' } as never);
    taskServiceMock.cancelTask.mockResolvedValue(undefined);
    taskServiceMock.retryTask.mockResolvedValue(undefined);
    taskServiceMock.getAdminStats.mockResolvedValue({ total: 1, byStatus: {}, byType: [] } as never);
  });

  it('rejects unauthenticated GET /tasks', async () => {
    tasksAuthOn = false;
    const res = await request(server).get('/tasks');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /tasks', async () => {
    tasksAuthOn = false;
    const res = await request(server).post('/tasks').send({ type: 'send_email', name: 'n' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /tasks/:id', async () => {
    tasksAuthOn = false;
    const res = await request(server).get(`/tasks/${taskId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.getTask).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /tasks/admin/stats', async () => {
    tasksAuthOn = false;
    const res = await request(server).get('/tasks/admin/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.getAdminStats).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /tasks/admin/stats even with x-test-role admin header', async () => {
    tasksAuthOn = false;
    const res = await request(server).get('/tasks/admin/stats').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.getAdminStats).not.toHaveBeenCalled();
  });

  it('forbids GET /tasks/admin/stats for non-admin role', async () => {
    const res = await request(server).get('/tasks/admin/stats');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    expect(taskServiceMock.getAdminStats).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /tasks/:id/cancel', async () => {
    tasksAuthOn = false;
    const res = await request(server).post(`/tasks/${taskId}/cancel`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.cancelTask).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /tasks/:id/retry', async () => {
    tasksAuthOn = false;
    const res = await request(server).post(`/tasks/${taskId}/retry`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(taskServiceMock.retryTask).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated core task routes even with x-test-role admin header', async () => {
    tasksAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/tasks').set(adminHdr);
    expect(res.status).toBe(401);
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();

    res = await request(server).post('/tasks').set(adminHdr).send({ type: 'send_email', name: 'n' });
    expect(res.status).toBe(401);
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();

    res = await request(server).get(`/tasks/${taskId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(taskServiceMock.getTask).not.toHaveBeenCalled();

    res = await request(server).post(`/tasks/${taskId}/cancel`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(taskServiceMock.cancelTask).not.toHaveBeenCalled();

    res = await request(server).post(`/tasks/${taskId}/retry`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(taskServiceMock.retryTask).not.toHaveBeenCalled();
  });

  it('POST /tasks returns 400 when query params are present', async () => {
    const res = await request(server).post('/tasks').query({ priority: '1' }).send({ type: 'send_email', name: 'n' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();
  });

  it('POST /tasks creates task', async () => {
    const res = await request(server)
      .post('/tasks')
      .send({ type: 'send_email', name: 'n' });
    expect(res.status).toBe(201);
    expect(taskServiceMock.createTask).toHaveBeenCalled();
  });

  it('POST /tasks returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .post('/tasks')
      .send({ type: 'send_email', name: 'n', unknown: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();
  });

  it('POST /tasks returns 400 when body invalid', async () => {
    const res = await request(server).post('/tasks').send({ type: '', name: 'n' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.createTask).not.toHaveBeenCalled();
  });

  it('POST /tasks returns 402 when plan limit exceeded', async () => {
    taskServiceMock.createTask.mockRejectedValueOnce(new PlanLimitError('Cap'));
    const res = await request(server).post('/tasks').send({ type: 't', name: 'n' });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PLAN_LIMIT_EXCEEDED');
  });

  it('GET /tasks lists with query', async () => {
    const res = await request(server).get('/tasks').query({ page: 2, limit: 5, status: 'queued' });
    expect(res.status).toBe(200);
    expect(taskServiceMock.listTasks).toHaveBeenCalledWith('u1', {
      page: 2,
      limit: 5,
      status: 'queued',
      type: undefined,
    });
  });

  it('GET /tasks returns 400 when limit exceeds cap', async () => {
    const res = await request(server).get('/tasks').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();
  });

  it('GET /tasks returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/tasks').query({ page: 1, foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();
  });

  it('GET /tasks defaults page and limit when query empty', async () => {
    const res = await request(server).get('/tasks');
    expect(res.status).toBe(200);
    expect(taskServiceMock.listTasks).toHaveBeenCalledWith('u1', {
      page: 1,
      limit: 20,
      status: undefined,
      type: undefined,
    });
  });

  it('GET /tasks defaults only limit when page provided', async () => {
    await request(server).get('/tasks').query({ page: '4' });
    expect(taskServiceMock.listTasks).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ page: 4, limit: 20 })
    );
  });

  it('GET /tasks defaults only page when limit provided', async () => {
    await request(server).get('/tasks').query({ limit: '15' });
    expect(taskServiceMock.listTasks).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ page: 1, limit: 15 })
    );
  });

  it('GET /tasks/:id', async () => {
    const res = await request(server).get(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(taskServiceMock.getTask).toHaveBeenCalledWith(taskId, 'u1');
  });

  it('GET /tasks/:id returns 400 for invalid uuid', async () => {
    const res = await request(server).get('/tasks/not-uuid');
    expect(res.status).toBe(400);
    expect(taskServiceMock.getTask).not.toHaveBeenCalled();
  });

  it('GET /tasks/:id returns 404 when service throws NotFoundError', async () => {
    taskServiceMock.getTask.mockRejectedValueOnce(new NotFoundError('Task'));
    const res = await request(server).get(`/tasks/${taskId}`);
    expect(res.status).toBe(404);
  });

  it('POST /tasks/:id/cancel', async () => {
    const res = await request(server).post(`/tasks/${taskId}/cancel`);
    expect(res.status).toBe(200);
    expect(taskServiceMock.cancelTask).toHaveBeenCalledWith(taskId, 'u1');
  });

  it('POST /tasks/:id/cancel returns 404 when cancel not applicable', async () => {
    taskServiceMock.cancelTask.mockRejectedValueOnce(new NotFoundError('Task'));
    const res = await request(server).post(`/tasks/${taskId}/cancel`);
    expect(res.status).toBe(404);
  });

  it('POST /tasks/:id/retry', async () => {
    const res = await request(server).post(`/tasks/${taskId}/retry`);
    expect(res.status).toBe(200);
    expect(taskServiceMock.retryTask).toHaveBeenCalledWith(taskId, 'u1');
  });

  it('POST /tasks/:id/retry returns 404 when retry not allowed', async () => {
    taskServiceMock.retryTask.mockRejectedValueOnce(new NotFoundError('Failed task'));
    const res = await request(server).post(`/tasks/${taskId}/retry`);
    expect(res.status).toBe(404);
  });

  it('POST /tasks/:id/cancel rejects unknown query keys', async () => {
    const res = await request(server).post(`/tasks/${taskId}/cancel`).query({ x: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.cancelTask).not.toHaveBeenCalled();
  });

  it('POST /tasks/:id/cancel returns 400 when body is not empty', async () => {
    const res = await request(server).post(`/tasks/${taskId}/cancel`).send({ force: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.cancelTask).not.toHaveBeenCalled();
  });

  it('POST /tasks/:id/retry rejects unknown query keys', async () => {
    const res = await request(server).post(`/tasks/${taskId}/retry`).query({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.retryTask).not.toHaveBeenCalled();
  });

  it('POST /tasks/:id/retry returns 400 when body is not empty', async () => {
    const res = await request(server).post(`/tasks/${taskId}/retry`).send({ reset: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.retryTask).not.toHaveBeenCalled();
  });

  it('GET /tasks/admin/stats', async () => {
    taskServiceMock.getAdminStats.mockResolvedValueOnce({
      total: 12,
      byStatus: { queued: 5, completed: 7 },
      byType: [{ type: 'send_email', count: 4 }],
    } as never);

    const res = await request(server).get('/tasks/admin/stats').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(taskServiceMock.getAdminStats).toHaveBeenCalled();
    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expectExactObjectKeys(res.body, ['success', 'message', 'data']);
    expectExactObjectKeys(res.body.data, ['total', 'byStatus', 'byType']);
    expect(res.body.data.total).toBe(12);
    expect(res.body.data.byStatus).toEqual({ queued: 5, completed: 7 });
    expect(Array.isArray(res.body.data.byType)).toBe(true);
    expect(res.body.data.byType).toHaveLength(1);
    expectExactObjectKeys(res.body.data.byType[0], ['type', 'count']);
    expect(typeof res.body.data.byType[0].count).toBe('number');
  });

  it('GET /tasks returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/tasks').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();
  });

  it('GET /tasks returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/tasks').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.listTasks).not.toHaveBeenCalled();
  });

  it('GET /tasks uses catch-default page when page is not numeric', async () => {
    const res = await request(server).get('/tasks').query({ page: 'nope', limit: '20' });
    expect(res.status).toBe(200);
    expect(taskServiceMock.listTasks).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });

  it('GET /tasks/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/tasks/${taskId}`).query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.getTask).not.toHaveBeenCalled();
  });

  it('GET /tasks/:id returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get(`/tasks/${taskId}`).send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.getTask).not.toHaveBeenCalled();
  });

  it('GET /tasks/admin/stats returns 400 when query params are present', async () => {
    const res = await request(server).get('/tasks/admin/stats').set('x-test-role', 'admin').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.getAdminStats).not.toHaveBeenCalled();
  });

  it('GET /tasks/admin/stats returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/tasks/admin/stats').set('x-test-role', 'admin').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.getAdminStats).not.toHaveBeenCalled();
  });

  it('POST /tasks/:id/cancel returns 400 for non-uuid id', async () => {
    const res = await request(server).post('/tasks/not-a-uuid/cancel');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.cancelTask).not.toHaveBeenCalled();
  });

  it('POST /tasks/:id/retry returns 400 for non-uuid id', async () => {
    const res = await request(server).post('/tasks/bad-id/retry');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(taskServiceMock.retryTask).not.toHaveBeenCalled();
  });
});

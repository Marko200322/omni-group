import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../modules/tasks/service/tasks.service', () => ({
  TasksService: jest.fn().mockImplementation(() => ({
    createTask: jest.fn(),
    listTasks: jest.fn().mockResolvedValue({ tasks: [], total: 0 }),
    getTask: jest.fn(),
    cancelTask: jest.fn(),
    retryTask: jest.fn(),
    getAdminStats: jest.fn().mockResolvedValue({ total: 0, byStatus: {}, byType: [] }),
  })),
}));

jest.mock('../../queue/queue', () => ({
  getQueue: jest.fn(() => ({ process: jest.fn() })),
  addJob: jest.fn(),
}));

let tasksAdminSecAuthOn = true;

jest.mock('../../api/middleware/auth.middleware', () => {
  const actual = jest.requireActual<typeof import('../../api/middleware/auth.middleware')>(
    '../../api/middleware/auth.middleware'
  );
  return {
    ...actual,
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!tasksAdminSecAuthOn) {
        throw new AuthenticationError('No authentication token provided');
      }
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role: 'user',
        email: 'u@test.com',
      };
      next();
    },
  };
});

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('TasksModule admin route security', () => {
  let server: http.Server;

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
    tasksAdminSecAuthOn = true;
  });

  it('GET /tasks/admin/stats returns 401 when unauthenticated', async () => {
    tasksAdminSecAuthOn = false;
    const res = await request(server).get('/tasks/admin/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /tasks/admin/stats returns 401 when unauthenticated even with x-test-role admin header', async () => {
    tasksAdminSecAuthOn = false;
    const res = await request(server).get('/tasks/admin/stats').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /tasks/admin/stats returns 403 for non-admin users', async () => {
    const res = await request(server).get('/tasks/admin/stats');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });
});

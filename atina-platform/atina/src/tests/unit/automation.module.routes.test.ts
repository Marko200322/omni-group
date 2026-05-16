import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { AutomationModule } from '../../modules/automation/automation.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import logger from '../../utils/logger';

jest.mock('../../database/connection');
jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

let autoAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!autoAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

function workflowSteps() {
  return [
    { id: 'a', type: 'send_email', config: { to: 't@x.com', subject: 'S' } },
    { id: 'b', type: 'http_request', config: { url: 'https://api.example/x', method: 'PATCH' } },
    { id: 'c', type: 'http_request', config: { url: 'https://api.example/y' } },
    { id: 'd', type: 'create_task', config: { taskType: 'custom', taskName: 'N', payload: { x: 1 } } },
    { id: 'e', type: 'create_task', config: {} },
    { id: 'f', type: 'notify', config: { title: 'T', message: 'M' } },
    { id: 'g', type: 'notify', config: {} },
    { id: 'h', type: 'condition', config: { condition: null } },
    {
      id: 'i',
      type: 'condition',
      config: { condition: { field: 'userId', operator: 'eq', value: 'u1' } },
    },
    {
      id: 'j',
      type: 'condition',
      config: { condition: { field: 'userId', operator: 'ne', value: 'other' } },
    },
    {
      id: 'k',
      type: 'condition',
      config: { condition: { field: 'n', operator: 'gt', value: 1 } },
    },
    {
      id: 'l',
      type: 'condition',
      config: { condition: { field: 'n', operator: 'lt', value: 10 } },
    },
    {
      id: 'm',
      type: 'condition',
      config: { condition: { field: 'userId', operator: 'contains', value: 'u' } },
    },
    {
      id: 'n',
      type: 'condition',
      config: { condition: { field: 'userId', operator: 'unknown_op', value: 1 } },
    },
    { id: 'o', type: 'wait', config: { duration: 999999 } },
    { id: 'p', type: 'custom_unknown', config: {} },
  ];
}

const WF_UUID = {
  deleteOk: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  deleteMissing: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  emptyPayload: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  runSteps: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  badPayload: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  stepErrors: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  notFound: '99999999-9999-4999-8999-999999999999',
} as const;

describe('AutomationModule HTTP routes', () => {
  let server: http.Server;
  let setIntervalSpy: jest.SpyInstance;
  let setTimeoutSpy: jest.SpyInstance;

  beforeAll(async () => {
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(((_fn: () => void) => {
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setInterval);

    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: (...args: unknown[]) => void) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);

    const app = express();
    app.use(express.json());
    const m = new AutomationModule();
    await m.initialize();
    app.use('/automation', m.router);
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
    setIntervalSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    autoAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated GET /automation/workflows', async () => {
    autoAuthOn = false;
    const res = await request(server).get('/automation/workflows');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /automation/workflows', async () => {
    autoAuthOn = false;
    const res = await request(server).post('/automation/workflows').send({
      name: 'WF',
      triggerType: 'manual',
      steps: [{ id: 's1', type: 'wait', config: { duration: 1 } }],
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /automation/workflows/:id/execute', async () => {
    autoAuthOn = false;
    const res = await request(server)
      .post(`/automation/workflows/${WF_UUID.emptyPayload}/execute`)
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /automation/executions/:id', async () => {
    autoAuthOn = false;
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server).get(`/automation/executions/${id}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /automation/workflows/:id', async () => {
    autoAuthOn = false;
    const res = await request(server).delete(`/automation/workflows/${WF_UUID.deleteOk}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /automation/executions', async () => {
    autoAuthOn = false;
    const res = await request(server).get('/automation/executions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated automation routes even with x-test-role admin header', async () => {
    autoAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };
    const execId = '123e4567-e89b-12d3-a456-426614174000';

    let res = await request(server).get('/automation/workflows').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/automation/workflows')
      .set(adminHdr)
      .send({
        name: 'WF',
        triggerType: 'manual',
        steps: [{ id: 's1', type: 'wait', config: { duration: 1 } }],
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post(`/automation/workflows/${WF_UUID.emptyPayload}/execute`)
      .set(adminHdr)
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get(`/automation/executions/${execId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).delete(`/automation/workflows/${WF_UUID.deleteOk}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/automation/executions').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/workflows paginates with defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'w1' }], rowCount: 1 } as never);

    const res = await request(server).get('/automation/workflows');
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 20, 0]);
  });

  it('GET /automation/workflows respects page and limit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/automation/workflows').query({ page: 2, limit: 5 });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 5, 5]);
  });

  it('GET /automation/workflows rejects limit above 100', async () => {
    const res = await request(server).get('/automation/workflows').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/workflows rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/automation/workflows').query({ page: 1, extra: 'x' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/automation/workflows')
      .query({ draft: '1' })
      .send({
        name: 'WF',
        triggerType: 'manual',
        steps: [{ id: 's1', type: 'wait', config: { duration: 1 } }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows creates template', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'new',
          name: 'WF',
          payload: {},
        },
      ],
      rowCount: 1,
    } as never);

    const res = await request(server)
      .post('/automation/workflows')
      .send({
        name: 'WF',
        triggerType: 'manual',
        steps: [{ id: 's1', type: 'wait', config: { duration: 1 } }],
      });

    expect(res.status).toBe(201);
    const insertArgs = mockQuery.mock.calls[0][1] as unknown[];
    expect(insertArgs[2]).toBeNull();
  });

  it('POST /automation/workflows returns 400 when body has unknown keys (strict schema)', async () => {
    const res = await request(server)
      .post('/automation/workflows')
      .send({
        name: 'WF',
        triggerType: 'manual',
        steps: [{ id: 's1', type: 'wait', config: { duration: 1 } }],
        extra: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows returns 400 when a step has unknown keys (strict schema)', async () => {
    const res = await request(server)
      .post('/automation/workflows')
      .send({
        name: 'WF',
        triggerType: 'manual',
        steps: [{ id: 's1', type: 'wait', config: { duration: 1 }, unknownStepField: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows accepts description', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'w2' }], rowCount: 1 } as never);

    const res = await request(server)
      .post('/automation/workflows')
      .send({
        name: 'W2',
        description: 'Desc',
        triggerType: 'schedule',
        steps: [{ id: 's1', type: 'send_email', config: { to: 'a@b.c', subject: 'x' } }],
      });

    expect(res.status).toBe(201);
    expect((mockQuery.mock.calls[0][1] as unknown[])[2]).toBe('Desc');
  });

  it('DELETE /automation/workflows/:id', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 } as never);
    const ok = await request(server).delete(`/automation/workflows/${WF_UUID.deleteOk}`);
    expect(ok.status).toBe(200);

    mockQuery.mockResolvedValueOnce({ rowCount: 0 } as never);
    const missing = await request(server).delete(`/automation/workflows/${WF_UUID.deleteMissing}`);
    expect(missing.status).toBe(404);
  });

  it('DELETE /automation/workflows/:id returns 400 for invalid workflow id', async () => {
    const res = await request(server).delete('/automation/workflows/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /automation/workflows/:id returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .delete(`/automation/workflows/${WF_UUID.deleteOk}`)
      .send({ cascade: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions/:id', async () => {
    const foundId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const missingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockQuery.mockResolvedValueOnce({ rows: [{ id: foundId }], rowCount: 1 } as never);
    const ok = await request(server).get(`/automation/executions/${foundId}`);
    expect(ok.status).toBe(200);

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const missing = await request(server).get(`/automation/executions/${missingId}`);
    expect(missing.status).toBe(404);
  });

  it('GET /automation/executions/:id returns 400 for invalid execution id', async () => {
    const res = await request(server).get('/automation/executions/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions uses default page and limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/automation/executions');
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 20, 0]);
  });

  it('GET /automation/executions lists with pagination', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'e1' }], rowCount: 1 } as never);
    const res = await request(server).get('/automation/executions').query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 10, 0]);
  });

  it('GET /automation/executions rejects limit above 100', async () => {
    const res = await request(server).get('/automation/executions').query({ limit: 200 });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/automation/executions').query({ limit: 10, sort: 'desc' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows/:id/execute completes when template has no steps key', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: WF_UUID.emptyPayload, name: 'Empty', payload: {} }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'exec-empty' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post(`/automation/workflows/${WF_UUID.emptyPayload}/execute`).send({});
    expect(res.status).toBe(200);

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const completed = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'completed'"));
    expect(completed).toBeDefined();
  });

  it('POST /automation/workflows/:id/execute runs steps and completes', async () => {
    const steps = workflowSteps();

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('workflow_template') && sql.includes('WHERE id')) {
        return { rows: [{ id: WF_UUID.runSteps, name: 'N', payload: { steps } }], rowCount: 1 } as never;
      }
      if (sql.includes('workflow_execution') && sql.includes('INSERT')) {
        return { rows: [{ id: 'exec-run' }], rowCount: 1 } as never;
      }
      if (sql.includes('INSERT INTO tasks') && sql.includes('VALUES ($1, $2, $3, $4')) {
        return { rows: [{ id: `task-${Math.random()}` }], rowCount: 1 } as never;
      }
      if (sql.includes('INSERT INTO notifications')) {
        return { rows: [], rowCount: 1 } as never;
      }
      if (sql.includes("status = 'completed'")) {
        return { rows: [], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 0 } as never;
    });

    const res = await request(server)
      .post(`/automation/workflows/${WF_UUID.runSteps}/execute`)
      .send({ context: { n: 5 } });

    expect(res.status).toBe(200);
    expect(res.body.data.executionId).toBe('exec-run');

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const completed = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'completed'"));
    expect(completed).toBeDefined();
  });

  it('POST /automation/workflows/:id/execute 404 when template missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post(`/automation/workflows/${WF_UUID.notFound}/execute`).send({});
    expect(res.status).toBe(404);
  });

  it('POST /automation/workflows/:id/execute returns 400 for invalid workflow id', async () => {
    const res = await request(server).post('/automation/workflows/not-a-uuid/execute').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows/:id/execute returns 400 when query params are present', async () => {
    const res = await request(server)
      .post(`/automation/workflows/${WF_UUID.emptyPayload}/execute`)
      .query({ sync: '1' })
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows/:id/execute returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .post(`/automation/workflows/${WF_UUID.emptyPayload}/execute`)
      .send({ notContext: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /automation/workflows/:id/execute fails execution when payload is invalid', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: WF_UUID.badPayload, name: 'Bad', payload: null }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'exec-bad' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post(`/automation/workflows/${WF_UUID.badPayload}/execute`).send({});
    expect(res.status).toBe(200);

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const failed = mockQuery.mock.calls.find(
      (c) => (c[0] as string).includes('failed') && (c[0] as string).includes('error_message')
    );
    expect(failed).toBeDefined();
  });

  it('POST /automation/workflows/:id/execute records step errors', async () => {
    const steps = [{ id: 'only', type: 'notify', config: { title: 'x', message: 'y' } }];

    let notifyCalls = 0;
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('workflow_template') && sql.includes('WHERE id')) {
        return { rows: [{ id: WF_UUID.stepErrors, name: 'W', payload: { steps } }], rowCount: 1 } as never;
      }
      if (sql.includes('workflow_execution') && sql.includes('INSERT')) {
        return { rows: [{ id: 'exec-err' }], rowCount: 1 } as never;
      }
      if (sql.includes('INSERT INTO notifications')) {
        notifyCalls += 1;
        if (notifyCalls === 1) {
          throw new Error('notify failed');
        }
      }
      if (sql.includes("status = 'completed'")) {
        return { rows: [], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 0 } as never;
    });

    const res = await request(server).post(`/automation/workflows/${WF_UUID.stepErrors}/execute`).send({});
    expect(res.status).toBe(200);

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    expect(logger.warn).toHaveBeenCalledWith(
      'Workflow step failed: only',
      expect.objectContaining({ error: 'notify failed' })
    );

    const completed = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'completed'"));
    expect(completed).toBeDefined();
  });

  it('GET /automation/workflows returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/automation/workflows').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/workflows returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/automation/workflows').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/workflows uses catch-default page when page is not numeric', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/automation/workflows').query({ page: 'nope', limit: '20' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 20, 0]);
  });

  it('GET /automation/executions returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/automation/executions').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/automation/executions').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions uses catch-default page when page is not numeric', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/automation/executions').query({ page: 'bad', limit: '15' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 15, 0]);
  });

  it('GET /automation/executions/:id returns 400 when query params are present', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const res = await request(server).get(`/automation/executions/${id}`).query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /automation/executions/:id returns 400 when body is not strictly empty', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const res = await request(server).get(`/automation/executions/${id}`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /automation/workflows/:id returns 400 when query params are present', async () => {
    const res = await request(server).delete(`/automation/workflows/${WF_UUID.deleteOk}`).query({ force: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

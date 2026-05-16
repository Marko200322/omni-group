import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { SelfHealingModule } from '../../../../modules/self-healing/self-healing.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let shAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!shAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      role,
      email: 'admin@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const u = (req as express.Request & { user?: { role: string } }).user;
    if (u?.role !== 'admin') {
      return res.status(403).json({ success: false });
    }
    next();
  },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const EVENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

describe('SelfHealingModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new SelfHealingModule();
    await m.initialize();
    app.use('/self-healing', m.router);
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
    shAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /self-healing/events returns 400 when query params are present', async () => {
    const res = await request(server).get('/self-healing/events').query({ limit: '10' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /self-healing/events', async () => {
    shAuthOn = false;
    const res = await request(server).get('/self-healing/events');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/events', async () => {
    shAuthOn = false;
    const res = await request(server).post('/self-healing/events').send({
      subsystem: 'crm',
      issueKey: 'k1',
      details: {},
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/events/:id/heal', async () => {
    shAuthOn = false;
    const res = await request(server)
      .post(`/self-healing/events/${EVENT_ID}/heal`)
      .send({ remediationAction: 'retry-job' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/auto-scan', async () => {
    shAuthOn = false;
    const res = await request(server).post('/self-healing/auto-scan').send({
      includeTasks: false,
      includePayments: false,
      includeIntegrations: false,
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/auto-heal', async () => {
    shAuthOn = false;
    const res = await request(server).post('/self-healing/auto-heal').send({ maxEvents: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /self-healing/events even with x-test-role admin header', async () => {
    shAuthOn = false;
    const res = await request(server).get('/self-healing/events').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/events even with x-test-role admin header', async () => {
    shAuthOn = false;
    const res = await request(server)
      .post('/self-healing/events')
      .set('x-test-role', 'admin')
      .send({
        subsystem: 'crm',
        issueKey: 'k1',
        details: {},
      });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/events/:id/heal even with x-test-role admin header', async () => {
    shAuthOn = false;
    const res = await request(server)
      .post(`/self-healing/events/${EVENT_ID}/heal`)
      .set('x-test-role', 'admin')
      .send({ remediationAction: 'retry-job' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/auto-scan even with x-test-role admin header', async () => {
    shAuthOn = false;
    const res = await request(server)
      .post('/self-healing/auto-scan')
      .set('x-test-role', 'admin')
      .send({
        includeTasks: false,
        includePayments: false,
        includeIntegrations: false,
      });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /self-healing/auto-heal even with x-test-role admin header', async () => {
    shAuthOn = false;
    const res = await request(server)
      .post('/self-healing/auto-heal')
      .set('x-test-role', 'admin')
      .send({ maxEvents: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /self-healing/events returns 403 for non-admin', async () => {
    const res = await request(server).get('/self-healing/events').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('GET /self-healing/events returns 400 when JSON body is not empty', async () => {
    const res = await request(server)
      .get('/self-healing/events')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 1 }));
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /self-healing/events lists events', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: EVENT_ID, status: 'detected' }], rowCount: 1 } as never);
    const res = await request(server).get('/self-healing/events');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /self-healing/events returns 400 on invalid body', async () => {
    const res = await request(server).post('/self-healing/events').send({ subsystem: 'a' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/self-healing/events')
      .query({ async: '1' })
      .send({
        subsystem: 'crm',
        issueKey: 'k1',
        details: {},
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/self-healing/events').send({
      subsystem: 'crm',
      issueKey: 'k1',
      details: {},
      extra: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events reports issue', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ id: EVENT_ID, subsystem: 'crm', issue_key: 'k1', status: 'detected' }],
        rowCount: 1,
      } as never);

    const res = await request(server).post('/self-healing/events').send({
      subsystem: 'crm',
      issueKey: 'k1',
      details: { reason: 'test' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(EVENT_ID);
  });

  it('POST /self-healing/events/:id/heal returns 400 for invalid uuid', async () => {
    const res = await request(server)
      .post('/self-healing/events/not-a-uuid/heal')
      .send({ remediationAction: 'retry-job' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events/:id/heal returns 400 when query params are present', async () => {
    const res = await request(server)
      .post(`/self-healing/events/${EVENT_ID}/heal`)
      .query({ force: '1' })
      .send({ remediationAction: 'retry-job' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events/:id/heal returns 400 for unknown body keys', async () => {
    const res = await request(server)
      .post(`/self-healing/events/${EVENT_ID}/heal`)
      .send({ remediationAction: 'retry-job', note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/events/:id/heal heals issue', async () => {
    const healed = {
      id: EVENT_ID,
      status: 'healed',
      subsystem: 'crm',
      issue_key: 'k1',
      details: {},
    };
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: EVENT_ID, subsystem: 'crm', issue_key: 'k1', details: {} }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [healed], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post(`/self-healing/events/${EVENT_ID}/heal`)
      .send({ remediationAction: 'retry-job' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healed');
  });

  it('POST /self-healing/auto-scan returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/self-healing/auto-scan')
      .query({ deep: '1' })
      .send({
        includeTasks: false,
        includePayments: false,
        includeIntegrations: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/auto-scan returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/self-healing/auto-scan').send({
      includeTasks: false,
      includePayments: false,
      includeIntegrations: false,
      extra: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/auto-scan completes with no failures', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/self-healing/auto-scan').send({
      includeTasks: false,
      includePayments: false,
      includeIntegrations: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.totalCreated).toBe(0);
  });

  it('POST /self-healing/auto-heal returns 400 when query params are present', async () => {
    const res = await request(server).post('/self-healing/auto-heal').query({ batch: '1' }).send({ maxEvents: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/auto-heal returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/self-healing/auto-heal').send({ maxEvents: 1, extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /self-healing/auto-heal with maxEvents 0 attempts nothing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/self-healing/auto-heal').send({ maxEvents: 0 });
    expect(res.status).toBe(200);
    expect(res.body.data.healed).toBe(0);
  });
});

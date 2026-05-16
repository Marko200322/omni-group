import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { AuditLogModule } from '../../../../modules/audit-log/audit-log.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let alAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!alAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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

describe('AuditLogModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new AuditLogModule();
    await m.initialize();
    app.use('/audit-log', m.router);
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
    alAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /audit-log returns 400 when query params are present', async () => {
    const res = await request(server).get('/audit-log').query({ page: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /audit-log', async () => {
    alAuthOn = false;
    const res = await request(server).get('/audit-log');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /audit-log', async () => {
    alAuthOn = false;
    const res = await request(server).post('/audit-log').send({
      eventType: 'user_login',
      entityType: 'session',
      entityId: 's1',
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /audit-log even with x-test-role admin header', async () => {
    alAuthOn = false;
    const res = await request(server).get('/audit-log').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /audit-log even with x-test-role admin header', async () => {
    alAuthOn = false;
    const res = await request(server)
      .post('/audit-log')
      .set('x-test-role', 'admin')
      .send({
        eventType: 'user_login',
        entityType: 'session',
        entityId: 's1',
      });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /audit-log returns 403 for non-admin', async () => {
    const res = await request(server).get('/audit-log').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('GET /audit-log returns 400 when body is not strict-empty', async () => {
    const res = await request(server)
      .get('/audit-log')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ extra: 1 }));
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /audit-log lists events', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'e1',
          event_type: 'test',
          entity_type: 'x',
          entity_id: 'y',
          severity: 'info',
          payload: {},
        },
      ],
      rowCount: 1,
    } as never);

    const res = await request(server).get('/audit-log');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].event_type).toBe('test');
  });

  it('POST /audit-log returns 400 on invalid body', async () => {
    const res = await request(server).post('/audit-log').send({ eventType: 'ab' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /audit-log returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/audit-log')
      .query({ dryRun: '1' })
      .send({
        eventType: 'user_login',
        entityType: 'session',
        entityId: 's1',
        severity: 'info',
        payload: {},
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /audit-log returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/audit-log').send({
      eventType: 'user_login',
      entityType: 'session',
      entityId: 's1',
      severity: 'info',
      payload: {},
      extra: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /audit-log records event', async () => {
    const row = {
      id: 'new-id',
      event_type: 'user_login',
      entity_type: 'session',
      entity_id: 's1',
      severity: 'info',
      payload: {},
    };
    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

    const res = await request(server).post('/audit-log').send({
      eventType: 'user_login',
      entityType: 'session',
      entityId: 's1',
      severity: 'info',
      payload: {},
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('new-id');
  });
});

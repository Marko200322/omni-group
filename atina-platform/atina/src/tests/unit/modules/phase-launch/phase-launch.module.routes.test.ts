import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { PhaseLaunchModule } from '../../../../modules/phase-launch/phase-launch.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let plAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!plAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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

describe('PhaseLaunchModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new PhaseLaunchModule();
    await m.initialize();
    app.use('/phase-launch', m.router);
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
    plAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /phase-launch returns 400 when query params are present', async () => {
    const res = await request(server).get('/phase-launch').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /phase-launch', async () => {
    plAuthOn = false;
    const res = await request(server).get('/phase-launch');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /phase-launch', async () => {
    plAuthOn = false;
    const res = await request(server).post('/phase-launch').send({ phase: 'v1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /phase-launch even with x-test-role admin header', async () => {
    plAuthOn = false;
    const res = await request(server).get('/phase-launch').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /phase-launch even with x-test-role admin header', async () => {
    plAuthOn = false;
    const res = await request(server)
      .post('/phase-launch')
      .set('x-test-role', 'admin')
      .send({ phase: 'v1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /phase-launch returns 403 for non-admin', async () => {
    const res = await request(server).get('/phase-launch').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('GET /phase-launch returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .get('/phase-launch')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 1 }));
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /phase-launch returns current phase', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ config: { current_phase: 'v5', notes: 'ok', updated_at: 't0' } }],
        rowCount: 1,
      } as never);

    const res = await request(server).get('/phase-launch');
    expect(res.status).toBe(200);
    expect(res.body.data.currentPhase).toBe('v5');
    expect(res.body.data.notes).toBe('ok');
  });

  it('POST /phase-launch returns 400 for invalid phase', async () => {
    const res = await request(server).post('/phase-launch').send({ phase: 'v99' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /phase-launch returns 400 when query params are present', async () => {
    const res = await request(server).post('/phase-launch').query({ force: '1' }).send({ phase: 'v1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /phase-launch returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/phase-launch').send({ phase: 'v1', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /phase-launch updates phase and audits', async () => {
    const afterConfig = { current_phase: 'v3', notes: 'roll', updated_at: 't1' };
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ config: { current_phase: 'v1', notes: '', updated_at: 't' } }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ config: afterConfig }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/phase-launch').send({ phase: 'v3', notes: 'roll' });
    expect(res.status).toBe(200);
    expect(res.body.data.currentPhase).toBe('v3');
    expect(res.body.data.changed).toBe(true);
    expect(res.body.data.previousPhase).toBe('v1');
  });
});

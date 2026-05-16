import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { AiMemoryModule } from '../../modules/ai-memory/ai-memory.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../database/connection');

let aiMemoryAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!aiMemoryAuthOn) {
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

describe('AiMemoryModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new AiMemoryModule();
    await m.initialize();
    app.use('/ai-memory', m.router);
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
    aiMemoryAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('POST /ai-memory/remember returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/ai-memory/remember')
      .query({ ttl: '1' })
      .send({ key: 'pref', value: { theme: 'dark' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /ai-memory/remember returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .post('/ai-memory/remember')
      .send({ key: 'pref', value: { x: 1 }, namespace: 'ns', ttl: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /ai-memory/remember stores with default namespace', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'log1', created_at: new Date() }], rowCount: 1 } as never);
    const res = await request(server)
      .post('/ai-memory/remember')
      .send({ key: 'pref', value: { theme: 'dark' } });

    expect(res.status).toBe(201);
    expect(mockQuery.mock.calls[0][1] as unknown[]).toEqual([
      'u1',
      'memory:global:pref',
      JSON.stringify({ theme: 'dark' }),
    ]);
  });

  it('POST /ai-memory/remember uses custom namespace', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'l2' }], rowCount: 1 } as never);
    await request(server)
      .post('/ai-memory/remember')
      .send({ key: 'key', value: { a: 1 }, namespace: 'tenant-a' });

    expect((mockQuery.mock.calls[0][1] as unknown[])[1]).toBe('memory:tenant-a:key');
  });

  it('GET /ai-memory/recall builds LIKE with key', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 } as never);
    const res = await request(server).get('/ai-memory/recall').query({ namespace: 'ns', key: 'foo' });
    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("LIKE $2 ESCAPE '!'");
    expect((mockQuery.mock.calls[0][1] as unknown[])[1]).toBe('memory:ns:foo%');
  });

  it('GET /ai-memory/recall uses global and wildcard when key omitted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    await request(server).get('/ai-memory/recall');
    expect((mockQuery.mock.calls[0][1] as unknown[])[1]).toBe('memory:global:%');
  });

  it('GET /ai-memory/recall escapes LIKE metacharacters in key and namespace', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    await request(server)
      .get('/ai-memory/recall')
      .query({ namespace: 'n_1', key: 'k%y' });
    expect((mockQuery.mock.calls[0][1] as unknown[])[1]).toBe('memory:n!_1:k!%y%');
  });

  it('GET /ai-memory/recall rejects invalid namespace length', async () => {
    const res = await request(server).get('/ai-memory/recall').query({ namespace: 'x', key: 'ab' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /ai-memory/recall returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/ai-memory/recall').query({ namespace: 'ns', limit: '10' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /ai-memory/recall returns 400 when JSON body has unknown keys', async () => {
    const res = await request(server)
      .get('/ai-memory/recall')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ payload: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /ai-memory/recall returns 400 when query string has unknown keys', async () => {
    const res = await request(server).get('/ai-memory/recall').query({ namespace: 'ns', debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /ai-memory/remember', async () => {
    aiMemoryAuthOn = false;
    const res = await request(server).post('/ai-memory/remember').send({ key: 'k', value: {} });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /ai-memory/recall', async () => {
    aiMemoryAuthOn = false;
    const res = await request(server).get('/ai-memory/recall');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /ai-memory/remember even with x-test-role admin header', async () => {
    aiMemoryAuthOn = false;
    const res = await request(server)
      .post('/ai-memory/remember')
      .set('x-test-role', 'admin')
      .send({ key: 'k', value: {} });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /ai-memory/recall even with x-test-role admin header', async () => {
    aiMemoryAuthOn = false;
    const res = await request(server).get('/ai-memory/recall').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

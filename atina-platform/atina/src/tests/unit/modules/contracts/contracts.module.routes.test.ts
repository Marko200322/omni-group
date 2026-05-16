import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { ContractsModule } from '../../../../modules/contracts/contracts.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let contractsAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!contractsAuthOn) {
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

jest.mock('../../../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('ContractsModule HTTP routes', () => {
  let server: http.Server;
  const contractId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ContractsModule();
    await m.initialize();
    app.use('/contracts', m.router);
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
    contractsAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated GET /contracts', async () => {
    contractsAuthOn = false;
    const res = await request(server).get('/contracts');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /contracts', async () => {
    contractsAuthOn = false;
    const res = await request(server).post('/contracts').send({
      title: 'Lease',
      content: 'body',
      status: 'draft',
      currency: 'USD',
      metadata: { x: 1 },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /contracts/stats/overview', async () => {
    contractsAuthOn = false;
    const res = await request(server).get('/contracts/stats/overview');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /contracts/:id', async () => {
    contractsAuthOn = false;
    const res = await request(server).get(`/contracts/${contractId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /contracts/:id', async () => {
    contractsAuthOn = false;
    const res = await request(server).patch(`/contracts/${contractId}`).send({ title: 'Hello' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /contracts/:id/sign', async () => {
    contractsAuthOn = false;
    const res = await request(server).post(`/contracts/${contractId}/sign`).send({ signedBy: 'Jane' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /contracts/:id/send', async () => {
    contractsAuthOn = false;
    const res = await request(server).post(`/contracts/${contractId}/send`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /contracts/:id/cancel', async () => {
    contractsAuthOn = false;
    const res = await request(server).post(`/contracts/${contractId}/cancel`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /contracts/:id', async () => {
    contractsAuthOn = false;
    const res = await request(server).delete(`/contracts/${contractId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated contracts routes even with x-test-role admin header', async () => {
    contractsAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/contracts').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/contracts')
      .set(adminHdr)
      .send({
        title: 'Lease',
        content: 'body',
        status: 'draft',
        currency: 'USD',
        metadata: { x: 1 },
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/contracts/stats/overview').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get(`/contracts/${contractId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).patch(`/contracts/${contractId}`).set(adminHdr).send({ title: 'Hello' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post(`/contracts/${contractId}/sign`)
      .set(adminHdr)
      .send({ signedBy: 'Jane' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post(`/contracts/${contractId}/send`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post(`/contracts/${contractId}/cancel`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).delete(`/contracts/${contractId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts lists with defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'c1' }], rowCount: 1 } as never);

    const res = await request(server).get('/contracts');
    expect(res.status).toBe(200);
    expect(res.body.meta?.total).toBe(2);
    expect(mockQuery.mock.calls[0][0]).not.toContain('c.status =');
  });

  it('GET /contracts filters by status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'c1', status: 'draft' }], rowCount: 1 } as never);

    const res = await request(server).get('/contracts').query({ status: 'draft', page: 2, limit: 5 });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('c.status = $2');
  });

  it('GET /contracts returns 400 for invalid status filter', async () => {
    const res = await request(server).get('/contracts').query({ status: 'pending' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts returns 400 when limit exceeds max', async () => {
    const res = await request(server).get('/contracts').query({ page: 1, limit: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts applies catch default for invalid page string when limit is valid', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/contracts').query({ page: 'x', limit: '20' });
    expect(res.status).toBe(200);
    const listArgs = mockQuery.mock.calls[1][1] as unknown[];
    expect(listArgs[listArgs.length - 2]).toBe(20);
    expect(listArgs[listArgs.length - 1]).toBe(0);
  });

  it('GET /contracts/:id returns row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, title: 'T', contact_name: 'A B' }],
      rowCount: 1,
    } as never);

    const res = await request(server).get(`/contracts/${contractId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('T');
  });

  it('GET /contracts/:id 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/contracts/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(res.status).toBe(404);
  });

  it('GET /contracts/:id returns 400 for invalid uuid', async () => {
    const res = await request(server).get('/contracts/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts creates', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'new', title: 'Lease' }],
      rowCount: 1,
    } as never);

    const res = await request(server)
      .post('/contracts')
      .send({
        title: 'Lease',
        content: 'body',
        status: 'draft',
        currency: 'USD',
        metadata: { x: 1 },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('new');
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[0]).toBe('u1');
    expect(args[2]).toBe('Lease');
    expect(args[3]).toBe('body');
  });

  it('POST /contracts returns 400 when query params are present', async () => {
    const res = await request(server).post('/contracts').query({ dryRun: '1' }).send({ title: 'T' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts uses null content and dates when omitted', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'min' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post('/contracts').send({ title: 'Minimal' });
    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[3]).toBeNull();
    expect(args[7]).toBeNull();
    expect(args[8]).toBeNull();
  });

  it('POST /contracts parses startDate and endDate', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'd1' }], rowCount: 1 } as never);

    const res = await request(server)
      .post('/contracts')
      .send({
        title: 'Dated',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[7]).toBeInstanceOf(Date);
    expect(args[8]).toBeInstanceOf(Date);
  });

  it('POST /contracts returns validation envelope on invalid body', async () => {
    const res = await request(server).post('/contracts').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
    });
    expect(Array.isArray(res.body.error?.details)).toBe(true);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 when value is not positive', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', value: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 when currency length is not 3', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', currency: 'US' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 for invalid contactId uuid', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', contactId: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 for invalid status', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', status: 'archived' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 when title exceeds 255 chars', async () => {
    const res = await request(server).post('/contracts').send({ title: 'a'.repeat(256) });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/sign returns 400 when signedBy empty', async () => {
    const res = await request(server).post(`/contracts/${contractId}/sign`).send({ signedBy: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id returns no changes when body empty', async () => {
    const res = await request(server).patch(`/contracts/${contractId}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ message: 'No changes' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id returns 400 for invalid param uuid', async () => {
    const res = await request(server).patch('/contracts/not-uuid').send({ title: 'N' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id returns 400 for invalid body', async () => {
    const res = await request(server).patch(`/contracts/${contractId}`).send({ status: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id updates with metadata and dates', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, metadata: '{}' }],
      rowCount: 1,
    } as never);

    const res = await request(server)
      .patch(`/contracts/${contractId}`)
      .send({
        title: 'New',
        metadata: { k: 'v' },
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE contracts SET');
    const arg = mockQuery.mock.calls[0][1] as unknown[];
    expect(arg).toContain(JSON.stringify({ k: 'v' }));
  });

  it('PATCH /contracts/:id 404 when update returns no row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server)
      .patch('/contracts/cccccccc-cccc-4ccc-8ccc-cccccccccccc')
      .send({ title: 'N' });
    expect(res.status).toBe(404);
  });

  it('POST /contracts/:id/sign updates row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, status: 'signed' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post(`/contracts/${contractId}/sign`).send({ signedBy: 'Jane' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([contractId, 'u1', 'Jane']);
  });

  it('POST /contracts/:id/sign 404 when missing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server)
      .post('/contracts/dddddddd-dddd-4ddd-8ddd-dddddddddddd/sign')
      .send({ signedBy: 'J' });
    expect(res.status).toBe(404);
  });

  it('POST /contracts/:id/send returns 400 when query params are present', async () => {
    const res = await request(server).post(`/contracts/${contractId}/send`).query({ notify: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/send returns 400 when body is not empty', async () => {
    const res = await request(server).post(`/contracts/${contractId}/send`).send({ note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/send updates draft', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, status: 'sent' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post(`/contracts/${contractId}/send`);
    expect(res.status).toBe(200);
  });

  it('POST /contracts/:id/send 404 when not draft', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/contracts/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/send');
    expect(res.status).toBe(404);
  });

  it('POST /contracts/:id/cancel updates draft', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, status: 'canceled' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post(`/contracts/${contractId}/cancel`);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain("status IN ('draft', 'sent')");
    expect(mockQuery.mock.calls[0][1]).toEqual([contractId, 'u1']);
  });

  it('POST /contracts/:id/cancel updates sent', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: contractId, status: 'canceled' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post(`/contracts/${contractId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('canceled');
  });

  it('POST /contracts/:id/cancel 404 when not cancelable', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/contracts/99999999-9999-4999-8999-999999999999/cancel');
    expect(res.status).toBe(404);
  });

  it('POST /contracts/:id/cancel returns 400 for invalid contract id uuid', async () => {
    const res = await request(server).post('/contracts/not-a-uuid/cancel');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/cancel returns 400 when body is not empty', async () => {
    const res = await request(server).post(`/contracts/${contractId}/cancel`).send({ reason: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /contracts/:id deletes draft', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 } as never);
    const res = await request(server).delete(`/contracts/${contractId}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /contracts/:id 404 when not deletable', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 } as never);
    const res = await request(server).delete('/contracts/ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(res.status).toBe(404);
  });

  it('GET /contracts/stats/overview aggregates', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { status: 'draft', count: '1' },
          { status: 'signed', count: '2' },
        ],
        rowCount: 2,
      } as never)
      .mockResolvedValueOnce({ rows: [{ total: '150.25' }], rowCount: 1 } as never);

    const res = await request(server).get('/contracts/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus).toEqual({ draft: 1, signed: 2 });
    expect(res.body.data.totalSignedValue).toBe(150.25);
  });

  it('POST /contracts/:id/sign returns 400 for invalid contract id uuid', async () => {
    const res = await request(server).post('/contracts/not-a-uuid/sign').send({ signedBy: 'Jane' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /contracts/:id returns 400 for invalid uuid', async () => {
    const res = await request(server).delete('/contracts/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /contracts/:id returns 400 when body has unknown keys', async () => {
    const res = await request(server).delete(`/contracts/${contractId}`).send({ force: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts/stats/overview returns empty byStatus when no rows', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never);

    const res = await request(server).get('/contracts/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus).toEqual({});
    expect(res.body.data.totalSignedValue).toBe(0);
  });

  it('GET /contracts/stats/overview returns 400 when query params are present', async () => {
    const res = await request(server).get('/contracts/stats/overview').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts/stats/overview returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/contracts/stats/overview').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/contracts').query({ page: 1, sort: 'desc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/contracts').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/contracts').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/contracts/${contractId}`).query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /contracts/:id returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get(`/contracts/${contractId}`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id returns 400 when query params are present', async () => {
    const res = await request(server).patch(`/contracts/${contractId}`).query({ dry: '1' }).send({ title: 'N' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/sign returns 400 when query params are present', async () => {
    const res = await request(server)
      .post(`/contracts/${contractId}/sign`)
      .query({ force: '1' })
      .send({ signedBy: 'Jane' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/sign returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post(`/contracts/${contractId}/sign`)
      .send({ signedBy: 'Jane', note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts/:id/cancel returns 400 when query params are present', async () => {
    const res = await request(server).post(`/contracts/${contractId}/cancel`).query({ soft: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', extraField: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /contracts/:id returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).patch(`/contracts/${contractId}`).send({ mystery: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 when endDate is before startDate', async () => {
    const res = await request(server)
      .post('/contracts')
      .send({
        title: 'Bad range',
        startDate: '2026-12-31T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /contracts returns 400 when startDate is not a valid date', async () => {
    const res = await request(server).post('/contracts').send({ title: 'T', startDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

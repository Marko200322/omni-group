import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { CrmModule } from '../../../../modules/crm/crm.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let crmAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!crmAuthOn) {
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

describe('CrmModule HTTP routes (modules/crm)', () => {
  let server: http.Server;
  const contactId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new CrmModule();
    await m.initialize();
    app.use('/crm', m.router);
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
    crmAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated GET /crm/contacts', async () => {
    crmAuthOn = false;
    const res = await request(server).get('/crm/contacts');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /crm/contacts', async () => {
    crmAuthOn = false;
    const res = await request(server)
      .post('/crm/contacts')
      .send({ firstName: 'Jane', tags: ['a'], customFields: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /crm/contacts/:id', async () => {
    crmAuthOn = false;
    const res = await request(server).get(`/crm/contacts/${contactId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /crm/contacts/:id', async () => {
    crmAuthOn = false;
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({ firstName: 'A' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /crm/contacts/:id', async () => {
    crmAuthOn = false;
    const res = await request(server).delete(`/crm/contacts/${contactId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /crm/contacts/bulk', async () => {
    crmAuthOn = false;
    const res = await request(server).post('/crm/contacts/bulk').send({ contacts: [] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /crm/stats', async () => {
    crmAuthOn = false;
    const res = await request(server).get('/crm/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated CRM routes even with x-test-role admin header', async () => {
    crmAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/crm/contacts').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/crm/contacts')
      .set(adminHdr)
      .send({ firstName: 'Jane', tags: ['a'], customFields: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get(`/crm/contacts/${contactId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).patch(`/crm/contacts/${contactId}`).set(adminHdr).send({ firstName: 'A' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).delete(`/crm/contacts/${contactId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/crm/contacts/bulk').set(adminHdr).send({ contacts: [] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/crm/stats').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts lists with defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/crm/contacts');
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).not.toContain('ILIKE');
  });

  it('GET /crm/contacts filters by search and status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'c1' }], rowCount: 1 } as never);

    const res = await request(server).get('/crm/contacts').query({
      page: 2,
      limit: 10,
      search: 'acme',
      status: 'lead',
    });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('ILIKE');
    expect(mockQuery.mock.calls[0][0]).toContain('status = $');
  });

  it('GET /crm/contacts returns 400 when limit exceeds cap', async () => {
    const res = await request(server).get('/crm/contacts').query({ limit: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/crm/contacts').query({ page: 1, sort: 'name' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts/:id returns contact', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: contactId, first_name: 'A' }], rowCount: 1 } as never);
    const res = await request(server).get(`/crm/contacts/${contactId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.first_name).toBe('A');
  });

  it('GET /crm/contacts/:id 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/crm/contacts/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(res.status).toBe(404);
  });

  it('GET /crm/contacts/:id returns 400 for invalid uuid', async () => {
    const res = await request(server).get('/crm/contacts/not-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts returns validation error for invalid email', async () => {
    const res = await request(server).post('/crm/contacts').send({ firstName: 'X', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts returns 400 for invalid status filter', async () => {
    const res = await request(server).get('/crm/contacts').query({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts creates contact', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'new', first_name: 'Jane' }],
      rowCount: 1,
    } as never);

    const res = await request(server)
      .post('/crm/contacts')
      .send({ firstName: 'Jane', tags: ['a'], customFields: { x: 1 } });

    expect(res.status).toBe(201);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('POST /crm/contacts returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .post('/crm/contacts')
      .send({ firstName: 'Jane', unknownField: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /crm/contacts/:id with empty body selects row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: contactId }], rowCount: 1 } as never);
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({});
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM crm_contacts');
  });

  it('PATCH /crm/contacts/:id updates when fields present', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: contactId, first_name: 'Bob' }], rowCount: 1 } as never);
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({ firstName: 'Bob' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE crm_contacts SET');
  });

  it('PATCH /crm/contacts/:id returns 400 when body has unknown keys', async () => {
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({ firstName: 'Bob', extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /crm/contacts/:id JSON-stringifies customFields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: contactId, custom_fields: '{}' }], rowCount: 1 } as never);
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({ customFields: { tier: 'gold' } });
    expect(res.status).toBe(200);
    const vals = mockQuery.mock.calls[0][1] as unknown[];
    expect(vals.some((v) => typeof v === 'string' && v.includes('gold'))).toBe(true);
  });

  it('PATCH /crm/contacts/:id 404 when update returns no row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server)
      .patch('/crm/contacts/cccccccc-cccc-4ccc-8ccc-cccccccccccc')
      .send({ firstName: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE /crm/contacts/:id', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] } as never);
    const res = await request(server).delete(`/crm/contacts/${contactId}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /crm/contacts/:id 404 when nothing deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] } as never);
    const res = await request(server).delete('/crm/contacts/dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    expect(res.status).toBe(404);
  });

  it('DELETE /crm/contacts/:id returns 400 when body has unknown keys', async () => {
    const res = await request(server).delete(`/crm/contacts/${contactId}`).send({ archive: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/stats', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [
          { status: 'lead', count: '3' },
          { status: 'customer', count: '2' },
        ],
        rowCount: 2,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 } as never);

    const res = await request(server).get('/crm/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.byStatus.lead).toBe(3);
    expect(res.body.data.recentActivity).toHaveLength(1);
  });

  it('POST /crm/contacts/bulk returns imported 0 when empty', async () => {
    const res = await request(server).post('/crm/contacts/bulk').send({ contacts: [] });
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts/bulk treats missing contacts array as empty', async () => {
    const res = await request(server).post('/crm/contacts/bulk').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
  });

  it('POST /crm/contacts/bulk imports contacts', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/crm/contacts/bulk')
      .send({
        contacts: [
          { firstName: 'A', email: 'a@b.com' },
          { first_name: 'B', last_name: 'L', status: 'prospect' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(2);
  });

  it('POST /crm/contacts/bulk returns 400 when body has unknown top-level keys', async () => {
    const res = await request(server)
      .post('/crm/contacts/bulk')
      .send({ contacts: [], mode: 'replace' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts/bulk skips failed inserts but counts successful rows', async () => {
    mockQuery
      .mockRejectedValueOnce(new Error('dup'))
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/crm/contacts/bulk')
      .send({ contacts: [{ firstName: 'bad' }, { firstName: 'ok' }] });

    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(1);
  });

  it('POST /crm/contacts/bulk returns 400 when a row has invalid email', async () => {
    const res = await request(server)
      .post('/crm/contacts/bulk')
      .send({ contacts: [{ firstName: 'A', email: 'bad' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/crm/contacts').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/crm/contacts').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts uses catch-default page when page is not numeric', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/crm/contacts').query({ page: 'nope', limit: '20' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    const listArgs = mockQuery.mock.calls[1][1] as unknown[];
    expect(listArgs[listArgs.length - 2]).toBe(20);
    expect(listArgs[listArgs.length - 1]).toBe(0);
  });

  it('GET /crm/contacts/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/crm/contacts/${contactId}`).query({ expand: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/contacts/:id returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get(`/crm/contacts/${contactId}`).send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts returns 400 when query params are present', async () => {
    const res = await request(server).post('/crm/contacts').query({ dry: '1' }).send({ firstName: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts returns 400 when firstName is empty', async () => {
    const res = await request(server).post('/crm/contacts').send({ firstName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /crm/contacts/:id returns 400 when query params are present', async () => {
    const res = await request(server)
      .patch(`/crm/contacts/${contactId}`)
      .query({ merge: '1' })
      .send({ firstName: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /crm/contacts/:id returns 400 for invalid status', async () => {
    const res = await request(server).patch(`/crm/contacts/${contactId}`).send({ status: 'vip' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /crm/contacts/:id returns 400 when query params are present', async () => {
    const res = await request(server).delete(`/crm/contacts/${contactId}`).query({ hard: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/stats returns 400 when query params are present', async () => {
    const res = await request(server).get('/crm/stats').query({ v: '2' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /crm/stats returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/crm/stats').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts/bulk returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/crm/contacts/bulk')
      .query({ upsert: '1' })
      .send({ contacts: [{ firstName: 'A' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /crm/contacts/bulk returns 400 when contacts array exceeds max', async () => {
    const contacts = Array.from({ length: 1001 }, () => ({ firstName: 'X' }));
    const res = await request(server).post('/crm/contacts/bulk').send({ contacts });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

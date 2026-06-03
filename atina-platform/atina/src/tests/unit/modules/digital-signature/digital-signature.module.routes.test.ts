import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { DigitalSignatureModule } from '../../../../modules/digital-signature/digital-signature.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

jest.mock('../../../../integrations', () => ({
  getBusinessDevClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

jest.mock('../../../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

let digitalSignatureAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../../../utils/errors')>('../../../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!digitalSignatureAuthOn) {
        throw new errors.AuthenticationError('No authentication token provided');
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

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('DigitalSignatureModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new DigitalSignatureModule();
    await m.initialize();
    app.use('/digital-signature', m.router);
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
    digitalSignatureAuthOn = true;
    mockQuery.mockReset();
  });

  it('GET /digital-signature lists workspaces', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'w1' }], rowCount: 1 } as never);
    const res = await request(server).get('/digital-signature');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 'digital-signature']);
  });

  it('POST /digital-signature creates workspace', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'new', name: 'Sign flow' }],
      rowCount: 1,
    } as never);
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).post('/digital-signature').send({ name: 'Sign flow' });
    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[1]).toBe('digital-signature');
    expect(args[3]).toBe(0);
    expect(JSON.parse(args[4] as string)).toMatchObject({ envelopes_open: 0 });
    const auditSql = mockQuery.mock.calls[1][0] as string;
    expect(auditSql).toContain('digital_signature_created');
    const auditArgs = mockQuery.mock.calls[1][1] as unknown[];
    expect(auditArgs[0]).toBe('u1');
    expect(auditArgs[1]).toBe('new');
    expect(JSON.parse(auditArgs[2] as string)).toEqual({ name: 'Sign flow' });
  });

  it('POST /digital-signature defaults budgetAllocated to 0 when omitted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ws-budget' }], rowCount: 1 } as never);
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/digital-signature').send({ name: 'Only name' });
    expect(res.status).toBe(201);
    expect((mockQuery.mock.calls[0][1] as unknown[])[3]).toBe(0);
  });

  it('POST /digital-signature persists explicit budgetAllocated', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ws2' }], rowCount: 1 } as never);
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/digital-signature').send({ name: 'Budgeted', budgetAllocated: 42.5 });
    expect(res.status).toBe(201);
    expect((mockQuery.mock.calls[0][1] as unknown[])[3]).toBe(42.5);
  });

  it('POST /digital-signature/:id/run request mode', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'wid' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).post('/digital-signature/wid/run').send({ mode: 'request' });
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('digital_signature_request');
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.result.signature_request_id).toBe('ds_stub_sigreq_001');
    const updateSql = mockQuery.mock.calls[2][0] as string;
    expect(updateSql).toContain('efficiency_score');
    const updateArgs = mockQuery.mock.calls[2][1] as unknown[];
    expect(updateArgs[0]).toBe('wid');
    expect(updateArgs[1]).toBe('request');
    expect(updateArgs[2]).toBe('digital_signature_request');
    const runAuditSql = mockQuery.mock.calls[3][0] as string;
    expect(runAuditSql).toContain('digital_signature_run_completed');
    const runAuditArgs = mockQuery.mock.calls[3][1] as unknown[];
    expect(runAuditArgs[0]).toBe('u1');
    expect(runAuditArgs[1]).toBe('run1');
    expect(JSON.parse(runAuditArgs[2] as string)).toEqual({ mode: 'request', systemId: 'wid' });
  });

  it('POST /digital-signature/:id/run defaults mode and input when body empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'def' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run-def' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).post('/digital-signature/def/run').send({});
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('digital_signature_request');
    const inputPayload = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(inputPayload).toEqual({ mode: 'request', input: {} });
  });

  it('POST /digital-signature/:id/run remind and verify modes', async () => {
    for (const mode of ['remind', 'verify'] as const) {
      jest.clearAllMocks();
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'x' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'r' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const res = await request(server).post('/digital-signature/xx/run').send({ mode });
      expect(res.status).toBe(200);
      expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe(`digital_signature_${mode}`);
    }
  });

  it('POST /digital-signature/:id/run 404 when workspace missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/digital-signature/missing/run').send({ mode: 'verify' });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('POST /digital-signature/:id/run validates input payload shape', async () => {
    const res = await request(server).post('/digital-signature/wid/run').send({ mode: 'remind', input: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'input' })])
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /digital-signature', async () => {
    digitalSignatureAuthOn = false;
    const res = await request(server).get('/digital-signature');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/digital-signature/!!!/run').send({ mode: 'request' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/digital-signature').send({ name: 'Valid nm', hack: true });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run persists documentRef from stub in output_payload', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'wid' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server)
      .post('/digital-signature/wid/run')
      .send({ mode: 'verify', input: { documentRef: 'contract-99' } });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.result.document_ref).toBe('contract-99');
  });

  it('POST /digital-signature/:id/run 400 on invalid mode', async () => {
    const res = await request(server).post('/digital-signature/pid/run').send({ mode: 'void' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature 400 when name too short after trim', async () => {
    const res = await request(server).post('/digital-signature').send({ name: '  ab  ' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature 400 when budgetAllocated is not finite', async () => {
    const res = await request(server).post('/digital-signature').send({ name: 'Good name', budgetAllocated: Number.NaN });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature 400 when name exceeds 255 characters', async () => {
    const res = await request(server).post('/digital-signature').send({ name: 'x'.repeat(256) });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature 400 when budgetAllocated is Infinity', async () => {
    const res = await request(server)
      .post('/digital-signature')
      .send({ name: 'Valid name ok', budgetAllocated: Number.POSITIVE_INFINITY });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run 400 when workspace id exceeds max length', async () => {
    const longId = 'a'.repeat(65);
    expect(longId.length).toBe(65);
    const res = await request(server).post(`/digital-signature/${longId}/run`).send({ mode: 'request' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run 400 when input is an array (must be object record)', async () => {
    const res = await request(server).post('/digital-signature/wid/run').send({ mode: 'request', input: [] });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/digital-signature/wid/run').send({ mode: 'request', extra: true });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /digital-signature returns 400 when query params are present', async () => {
    const res = await request(server).get('/digital-signature').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /digital-signature returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/digital-signature').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature returns 400 when query params are present', async () => {
    const res = await request(server).post('/digital-signature').query({ draft: '1' }).send({ name: 'Good name' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /digital-signature/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/digital-signature/wid/run')
      .query({ sync: '1' })
      .send({ mode: 'request' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /digital-signature', async () => {
    digitalSignatureAuthOn = false;
    const res = await request(server).post('/digital-signature').send({ name: 'No auth' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /digital-signature/:id/run', async () => {
    digitalSignatureAuthOn = false;
    const res = await request(server).post('/digital-signature/wid/run').send({ mode: 'request' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated digital-signature routes even with x-test-role admin header', async () => {
    digitalSignatureAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/digital-signature').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/digital-signature').set(adminHdr).send({ name: 'No auth' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/digital-signature/wid/run')
      .set(adminHdr)
      .send({ mode: 'request' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

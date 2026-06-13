import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { IntegrationHubModule } from '../../modules/integration-hub/integration-hub.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import * as ecosystemIdempotency from '../../utils/ecosystem-idempotency';

// eslint-disable-next-line no-var
var integrationHubRepo: {
  create: jest.Mock;
  listByUser: jest.Mock;
  touchSync: jest.Mock;
  ensureShadowEcosystemForIntegration: jest.Mock;
  createRun: jest.Mock;
};

jest.mock('../../modules/integration-hub/repository/integration-hub.repository', () => {
  integrationHubRepo = {
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'integration-1' }], rowCount: 1 }),
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'integration-1' }], rowCount: 1 }),
    touchSync: jest.fn().mockResolvedValue({
      rows: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          provider_slug: 'slack',
          display_name: 'Slack',
          last_sync_at: '2026-04-01T12:00:00.000Z',
        },
      ],
      rowCount: 1,
    }),
    ensureShadowEcosystemForIntegration: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }], rowCount: 1 }),
  };
  return {
    IntegrationHubRepository: jest.fn().mockImplementation(() => integrationHubRepo),
  };
});

jest.mock('../../utils/ecosystem-idempotency', () => {
  const actual = jest.requireActual<typeof import('../../utils/ecosystem-idempotency')>(
    '../../utils/ecosystem-idempotency'
  );
  return {
    ...actual,
    withEcosystemIdempotencyLock: jest.fn(
      async (_systemId: string, _idempotencyKey: string, work: () => Promise<unknown>) => work()
    ),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
});

const mockFindRecent = ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey as jest.MockedFunction<
  typeof ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey
>;

let authEnabled = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
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

describe('IntegrationHubModule HTTP routes', () => {
  let server: http.Server;

  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
    expect(body).not.toHaveProperty('error');
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new IntegrationHubModule();
    await m.initialize();
    app.use('/integration-hub', m.router);
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
    authEnabled = true;
    jest.clearAllMocks();
    integrationHubRepo.create.mockResolvedValue({ rows: [{ id: 'integration-new' }], rowCount: 1 });
    integrationHubRepo.listByUser.mockResolvedValue({ rows: [{ id: 'integration-1' }], rowCount: 1 });
    integrationHubRepo.touchSync.mockResolvedValue({
      rows: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          provider_slug: 'slack',
          display_name: 'Slack',
          last_sync_at: '2026-04-01T12:00:00.000Z',
        },
      ],
      rowCount: 1,
    });
    integrationHubRepo.ensureShadowEcosystemForIntegration.mockResolvedValue({ rows: [], rowCount: 0 });
    integrationHubRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }], rowCount: 1 });
    mockFindRecent.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('GET / lists integrations', async () => {
    const res = await request(server).get('/integration-hub');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(integrationHubRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('POST / creates integration', async () => {
    const res = await request(server)
      .post('/integration-hub')
      .send({
        providerSlug: 'slack',
        displayName: 'Slack',
        credentials: { token: 'x' },
        config: {},
      });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(integrationHubRepo.create).toHaveBeenCalled();
  });

  it('POST /sync completes without idempotency header', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server).post('/integration-hub/sync').send({ integrationId: id });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        id,
        provider_slug: 'slack',
        status: 'ok',
        operation: 'sync',
      })
    );
    expect(integrationHubRepo.touchSync).toHaveBeenCalledWith(id, 'u1');
    expect(integrationHubRepo.ensureShadowEcosystemForIntegration).toHaveBeenCalledWith(id, 'u1', 'Slack', 'slack');
    expect(integrationHubRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /sync with Idempotency-Key records ecosystem run', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server)
      .post('/integration-hub/sync')
      .set('Idempotency-Key', 'http-idem-1')
      .send({ integrationId: id });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(integrationHubRepo.ensureShadowEcosystemForIntegration).toHaveBeenCalledWith(id, 'u1', 'Slack', 'slack');
    expect(integrationHubRepo.createRun).toHaveBeenCalled();
  });

  it('POST /sync 404 when integration missing', async () => {
    integrationHubRepo.touchSync.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server)
      .post('/integration-hub/sync')
      .send({ integrationId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST / 400 on invalid body', async () => {
    const res = await request(server).post('/integration-hub').send({ providerSlug: 'x', displayName: 'ab' });
    expect(res.status).toBe(400);
  });

  it('GET /integration-hub returns 400 when query params are present', async () => {
    const res = await request(server).get('/integration-hub').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /integration-hub returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/integration-hub').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.listByUser).not.toHaveBeenCalled();
  });

  it('POST /integration-hub returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/integration-hub')
      .query({ draft: '1' })
      .send({
        providerSlug: 'slack',
        displayName: 'Slack',
        credentials: {},
        config: {},
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.create).not.toHaveBeenCalled();
  });

  it('POST /integration-hub returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/integration-hub').send({
      providerSlug: 'slack',
      displayName: 'Slack',
      credentials: {},
      config: {},
      extra: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.create).not.toHaveBeenCalled();
  });

  it('POST /integration-hub/sync returns 400 when query params are present', async () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server).post('/integration-hub/sync').query({ force: '1' }).send({ integrationId: id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
  });

  it('POST /integration-hub/sync returns 400 when integrationId is not a UUID', async () => {
    const res = await request(server).post('/integration-hub/sync').send({ integrationId: 'not-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /integration-hub', async () => {
    authEnabled = false;
    const res = await request(server).get('/integration-hub');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /integration-hub', async () => {
    authEnabled = false;
    const res = await request(server).post('/integration-hub').send({
      providerSlug: 'slack',
      displayName: 'Slack',
      credentials: {},
      config: {},
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /integration-hub/sync', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/integration-hub/sync')
      .send({ integrationId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated integration-hub routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };
    const id = '123e4567-e89b-12d3-a456-426614174000';

    let res = await request(server).get('/integration-hub').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server)
      .post('/integration-hub')
      .set(adminHdr)
      .send({
        providerSlug: 'slack',
        displayName: 'Slack',
        credentials: {},
        config: {},
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.create).not.toHaveBeenCalled();

    res = await request(server).post('/integration-hub/sync').set(adminHdr).send({ integrationId: id });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
  });
});

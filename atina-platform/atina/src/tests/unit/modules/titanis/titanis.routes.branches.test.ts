import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanisModule } from '../../../../modules/titanis/titanis.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var titanisRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditWorkspaceCreated: jest.Mock;
  auditRunCompleted: jest.Mock;
};

jest.mock('../../../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false, fetchRecommendations: jest.fn() }),
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

jest.mock('../../../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    auditWorkspaceCreated: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    auditRunCompleted: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
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

describe('TitanisModule HTTP branches', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanisModule();
    await m.initialize();
    app.use('/titanis', m.router);
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
    jest.clearAllMocks();
    titanisRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    titanisRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    titanisRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    });
    titanisRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    titanisRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    titanisRepo.auditWorkspaceCreated.mockResolvedValue({ rows: [], rowCount: 0 });
    titanisRepo.auditRunCompleted.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('POST /titanis rejects create body with short name', async () => {
    const res = await request(server).post('/titanis').send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run rejects invalid mode', async () => {
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'invalid', targetCount: 5 });
    expect(res.status).toBe(400);
  });

  it('POST /titanis/:id/run rejects targetCount above maximum', async () => {
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 501 });
    expect(res.status).toBe(400);
    expect(titanisRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run rejects invalid workspace id in path', async () => {
    const res = await request(server).post('/titanis/ws@1/run').send({ mode: 'lead-hunt', targetCount: 5 });
    expect(res.status).toBe(400);
    expect(titanisRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run returns 500 when run row cannot be persisted', async () => {
    titanisRepo.createRun.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 5 });
    expect(res.status).toBe(500);
    expect(res.body.error?.code).toBe('TITANIS_RUN_PERSIST_FAILED');
  });
});

import express from 'express';
import request from 'supertest';
import 'express-async-errors';
import { AppError } from '../../utils/errors';
import { sendError } from '../../utils/response';

let authEnabled = true;

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      return next(new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR'));
    }
    req.user = { userId: 'user-1', role: 'user', email: 'user@atina.io' };
    return next();
  },
}));

jest.mock('../../modules/workflow-chain/controller/workflow-chain.controller', () => ({
  WorkflowChainController: jest.fn().mockImplementation(() => ({
    list: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    listTemplates: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    previewTemplate: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    bootstrapTemplates: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    createFromTemplate: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    createAndRunFromTemplate: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    executionStats: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    stepAnalytics: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    listExecutions: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    getExecution: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    rerunExecution: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    get: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    validate: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    update: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    pause: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    activate: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    clone: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    delete: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
    create: (_req: express.Request, res: express.Response) => res.status(201).json({ success: true }),
    run: (_req: express.Request, res: express.Response) => res.status(200).json({ success: true }),
  })),
}));

describe('WorkflowChain module route security', () => {
  const buildApp = async () => {
    const { WorkflowChainModule } = await import('../../modules/workflow-chain/workflow-chain.module');
    const module = new WorkflowChainModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/workflow-chain', module.router);
    app.use((err: Error & { statusCode?: number; code?: string; details?: unknown }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (typeof err.statusCode === 'number' && typeof err.code === 'string') {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500, 'INTERNAL_ERROR');
    });
    return app;
  };

  beforeEach(() => {
    authEnabled = true;
    delete process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_SESSION_RATE_LIMIT_MAX;
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_SESSION_RATE_LIMIT_MAX;
  });

  it('returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/workflow-chain');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated POST /workflow-chain', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app)
      .post('/workflow-chain')
      .send({
        name: 'abc',
        steps: [{ step: 'One', moduleSlug: 'crm', action: 'noop', config: {} }],
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it.each([
    {
      name: 'GET /workflow-chain',
      exec: (app: express.Application) => request(app).get('/workflow-chain'),
    },
    {
      name: 'POST /workflow-chain',
      exec: (app: express.Application) =>
        request(app)
          .post('/workflow-chain')
          .send({
            name: 'abc',
            steps: [{ step: 'One', moduleSlug: 'crm', action: 'noop', config: {} }],
          }),
    },
  ])(
    'returns 401 when unauthenticated $name even with x-test-role admin header',
    async ({ exec }) => {
      authEnabled = false;
      const app = await buildApp();
      const res = await exec(app).set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    }
  );

  it('returns 400 for invalid workflow id param', async () => {
    const app = await buildApp();
    const res = await request(app).get('/workflow-chain/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  const sampleChainId = '11111111-1111-4111-8111-111111111111';

  it('returns 400 when pause body contains unknown keys', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/workflow-chain/${sampleChainId}/pause`)
      .send({ extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when activate body contains unknown keys', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/workflow-chain/${sampleChainId}/activate`)
      .send({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows empty JSON body on pause and activate', async () => {
    const app = await buildApp();
    await request(app).post(`/workflow-chain/${sampleChainId}/pause`).send({}).expect(200);
    await request(app).post(`/workflow-chain/${sampleChainId}/activate`).send({}).expect(200);
  });

  it('returns 400 when DELETE chain body contains unknown keys', async () => {
    const app = await buildApp();
    const res = await request(app)
      .delete(`/workflow-chain/${sampleChainId}`)
      .send({ extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when GET /workflow-chain sends JSON body with unknown keys', async () => {
    const app = await buildApp();
    const res = await request(app)
      .get('/workflow-chain')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filter: 'all' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when auth session limiter is exceeded', async () => {
    process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_SESSION_RATE_LIMIT_MAX = '1';
    const app = await buildApp();

    await request(app).get('/workflow-chain').expect(200);
    const blocked = await request(app).get('/workflow-chain');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { LiveCallAvatarModule } from '../../modules/live-call-avatar/live-call-avatar.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import { LiveSessionOrchestratorService } from '../../modules/live-call-avatar/service/live-session-orchestrator.service';

jest.mock('../../modules/live-call-avatar/service/live-session-orchestrator.service');
jest.mock('../../modules/live-call-avatar/service/live-meeting-bridge.service');

let authOn = true;

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  paymentsLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  webhookLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('LiveCallAvatarModule HTTP routes', () => {
  let server: http.Server;
  let statusSpy: jest.SpyInstance;
  let startSpy: jest.SpyInstance;

  const SESSION_UUID = '550e8400-e29b-41d4-a716-446655440099';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new LiveCallAvatarModule();
    await m.initialize();
    app.use('/live-call-avatar', m.router);
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    authOn = true;
    jest.clearAllMocks();
    statusSpy = jest.spyOn(LiveSessionOrchestratorService.prototype, 'getProviderStatus').mockReturnValue({
      enabled: true,
      liveReady: false,
      humanHandoffEnabled: true,
      maxDurationMinutes: 30,
      recallConfigured: false,
      providers: [],
    });
    startSpy = jest.spyOn(LiveSessionOrchestratorService.prototype, 'startSession').mockResolvedValue({
      sessionId: SESSION_UUID,
      status: 'active',
      provider: 'stub',
      platform: 'browser',
      greeting: 'Hello',
      clientConfig: { mode: 'stub' },
      agent: {
        id: 'mila',
        name: 'Mila',
        title: 'Support',
        avatarUrl: '/avatars/portraits/mila.svg',
        backgroundUrl: '/avatars/backgrounds/support-wfh.svg',
      },
      joinUrl: null,
      meetingUrl: null,
    });
  });

  it('GET /status returns provider status without auth', async () => {
    const res = await request(server).get('/live-call-avatar/status');
    expect(res.status).toBe(200);
    expect(statusSpy).toHaveBeenCalled();
    expect(res.body.data.enabled).toBe(true);
  });

  it('POST /session requires auth', async () => {
    authOn = false;
    const res = await request(server).post('/live-call-avatar/session').send({ agentType: 'support' });
    expect(res.status).toBe(401);
  });

  it('POST /session starts live session', async () => {
    const res = await request(server)
      .post('/live-call-avatar/session')
      .send({ agentType: 'support', platform: 'browser', liveProvider: 'stub' });
    expect(res.status).toBe(201);
    expect(startSpy).toHaveBeenCalledWith('u1', expect.objectContaining({ agentType: 'support' }));
    expect(res.body.data.sessionId).toBe(SESSION_UUID);
  });
});

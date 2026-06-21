import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { VideoMeetingsModule } from '../../modules/video-meetings/video-meetings.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import { VideoMeetingsService } from '../../modules/video-meetings/service/video-meetings.service';

jest.mock('../../modules/video-meetings/service/video-meetings.service');

let authOn = true;
let adminOn = true;

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: adminOn ? 'admin' : 'user',
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const user = (req as express.Request & { user?: { role: string } }).user;
    if (user?.role !== 'admin') {
      throw new AuthenticationError('Admin required');
    }
    next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  paymentsLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('VideoMeetingsModule HTTP routes', () => {
  let server: http.Server;
  let getAgentsSpy: jest.SpyInstance;
  let getMethodsSpy: jest.SpyInstance;
  let bookSpy: jest.SpyInstance;
  let listMineSpy: jest.SpyInstance;
  let confirmSpy: jest.SpyInstance;

  const MEETING_UUID = '550e8400-e29b-41d4-a716-446655440001';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new VideoMeetingsModule();
    await m.initialize();
    app.use('/video-meetings', m.router);
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
    adminOn = true;
    jest.clearAllMocks();
    getAgentsSpy = jest.spyOn(VideoMeetingsService.prototype, 'getAgents').mockResolvedValue({
      agentType: 'support',
      rosterSource: 'system',
      agents: [{
        id: 'mila',
        name: 'Mila',
        title: 'Podrška',
        avatarUrl: null,
        backgroundUrl: null,
        avatarType: 'initials',
        capabilities: { chat: true, voice: false, video: false, ai: false, aggregator: false },
        agentType: 'support',
        rosterSource: 'system',
      }],
    });
    getMethodsSpy = jest.spyOn(VideoMeetingsService.prototype, 'getMethods').mockReturnValue({
      meetingType: 'support',
      methods: [{ id: 'manual', label: 'Ručno', available: true, description: 'Admin potvrda' }],
    });
    bookSpy = jest.spyOn(VideoMeetingsService.prototype, 'book').mockResolvedValue({
      id: MEETING_UUID,
      status: 'pending',
      topic: 'Help',
    } as never);
    listMineSpy = jest.spyOn(VideoMeetingsService.prototype, 'listMine').mockResolvedValue([]);
    confirmSpy = jest.spyOn(VideoMeetingsService.prototype, 'confirmSupportMeeting').mockResolvedValue({
      id: MEETING_UUID,
      status: 'scheduled',
    } as never);
  });

  it('GET /support/agents returns agent profile', async () => {
    const res = await request(server).get('/video-meetings/support/agents');
    expect(res.status).toBe(200);
    expect(getAgentsSpy).toHaveBeenCalledWith('support');
    expect(res.body.data.agents[0].name).toBe('Mila');
  });

  it('GET /support/methods returns providers', async () => {
    const res = await request(server).get('/video-meetings/support/methods');
    expect(res.status).toBe(200);
    expect(getMethodsSpy).toHaveBeenCalledWith('support');
  });

  it('POST /support/book requires auth', async () => {
    authOn = false;
    const res = await request(server)
      .post('/video-meetings/support/book')
      .send({ topic: 'API help', provider: 'manual' });
    expect(res.status).toBe(401);
  });

  it('POST /support/book creates meeting', async () => {
    const res = await request(server)
      .post('/video-meetings/support/book')
      .send({ topic: 'API help', provider: 'manual' });
    expect(res.status).toBe(201);
    expect(bookSpy).toHaveBeenCalledWith('u1', 'support', expect.objectContaining({ topic: 'API help' }));
  });

  it('GET /support/mine lists user meetings', async () => {
    const res = await request(server).get('/video-meetings/support/mine');
    expect(res.status).toBe(200);
    expect(listMineSpy).toHaveBeenCalledWith('u1', 'support');
  });

  it('POST /support/confirm/:id requires admin', async () => {
    adminOn = false;
    const res = await request(server)
      .post(`/video-meetings/support/confirm/${MEETING_UUID}`)
      .send({ meetingUrl: 'https://meet.google.com/abc-defg-hij' });
    expect(res.status).toBe(401);
  });

  it('POST /support/confirm/:id schedules meeting', async () => {
    const res = await request(server)
      .post(`/video-meetings/support/confirm/${MEETING_UUID}`)
      .send({ meetingUrl: 'https://meet.google.com/abc-defg-hij' });
    expect(res.status).toBe(200);
    expect(confirmSpy).toHaveBeenCalled();
  });
});

import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ProblemHunterModule } from '../../modules/problem-hunter/problem-hunter.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var problemHunterService: {
  status: jest.Mock;
  listSignals: jest.Mock;
  runSearch: jest.Mock;
};

jest.mock('../../modules/problem-hunter/service/problem-hunter.service', () => {
  problemHunterService = {
    status: jest.fn(),
    listSignals: jest.fn(),
    runSearch: jest.fn(),
  };
  return {
    ProblemHunterService: jest.fn().mockImplementation(() => problemHunterService),
  };
});

let phAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!phAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'admin-1',
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

describe('ProblemHunterModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ProblemHunterModule();
    await m.initialize();
    app.use('/problem-hunter', m.router);
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
    phAuthOn = true;
    jest.clearAllMocks();
    problemHunterService.status.mockResolvedValue({
      module: 'problem-hunter',
      tavilyConfigured: false,
      sources: [],
    });
    problemHunterService.listSignals.mockResolvedValue({ items: [] });
    problemHunterService.runSearch.mockResolvedValue({ runId: 'r1', signalsCreated: 0 });
  });

  it('requires auth on GET /status', async () => {
    phAuthOn = false;
    const res = await request(server).get('/problem-hunter/status');
    expect(res.status).toBe(401);
    expect(problemHunterService.status).not.toHaveBeenCalled();
  });

  it('requires admin on GET /status', async () => {
    const res = await request(server).get('/problem-hunter/status').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(problemHunterService.status).not.toHaveBeenCalled();
  });

  it('returns status for admin', async () => {
    const res = await request(server).get('/problem-hunter/status').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(problemHunterService.status).toHaveBeenCalled();
  });

  it('requires admin on GET /signals', async () => {
    const res = await request(server).get('/problem-hunter/signals').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(problemHunterService.listSignals).not.toHaveBeenCalled();
  });

  it('returns signals for admin', async () => {
    const res = await request(server).get('/problem-hunter/signals').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(problemHunterService.listSignals).toHaveBeenCalledWith('admin-1', expect.any(Object));
  });

  it('requires admin on POST /search/run', async () => {
    const res = await request(server)
      .post('/problem-hunter/search/run')
      .set('x-test-role', 'user')
      .send({ sourceId: 'manual_import', query: 'x', industryCategory: 'marketing' });
    expect(res.status).toBe(403);
    expect(problemHunterService.runSearch).not.toHaveBeenCalled();
  });
});

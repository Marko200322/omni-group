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
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u-mem',
      role: 'user',
      email: 'mem@test.com',
    };
    return next();
  },
}));

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

import { AiMemoryModule } from '../../modules/ai-memory/ai-memory.module';

describe('AiMemory module route security', () => {
  const buildApp = async () => {
    const module = new AiMemoryModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/ai-memory', module.router);
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
  });

  it('returns 401 when unauthenticated on POST /remember', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).post('/ai-memory/remember').send({ key: 'ab', value: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated on GET /recall', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/ai-memory/recall');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated on POST /remember even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app)
      .post('/ai-memory/remember')
      .set('x-test-role', 'admin')
      .send({ key: 'ab', value: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated on GET /recall even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/ai-memory/recall').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });
});

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
      userId: 'u-rec',
      role: 'user',
      email: 'rec@test.com',
    };
    return next();
  },
}));

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

import { RecommendationModule } from '../../modules/recommendation/recommendation.module';

describe('Recommendation module route security', () => {
  const buildApp = async () => {
    const module = new RecommendationModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/recommendation', module.router);
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

  it('returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/recommendation/next-actions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const app = await buildApp();
    const res = await request(app).get('/recommendation/next-actions').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when GET sends JSON body with unknown keys', async () => {
    authEnabled = true;
    const app = await buildApp();
    const res = await request(app)
      .get('/recommendation/next-actions')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ hint: 'x' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

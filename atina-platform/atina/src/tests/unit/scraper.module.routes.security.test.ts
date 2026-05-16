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
      userId: 'u-sec',
      role: 'user',
      email: 'sec@test.com',
    };
    return next();
  },
}));

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

describe('Scraper module route security and URL validation', () => {
  const buildApp = async () => {
    const { ScraperModule } = await import('../../modules/scraper/scraper.module');
    const module = new ScraperModule();
    await module.initialize();
    const app = express();
    app.use(express.json());
    app.use('/scraper', module.router);
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
    jest.resetModules();
  });

  it('returns 401 when unauthenticated for scrape, bulk, jobs, and preview', async () => {
    authEnabled = false;
    const app = await buildApp();

    const scrape = await request(app).post('/scraper/scrape').send({ url: 'https://example.com/' });
    expect(scrape.status).toBe(401);
    expect(scrape.body.error.code).toBe('AUTHENTICATION_ERROR');

    const bulk = await request(app)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://example.com/'] });
    expect(bulk.status).toBe(401);
    expect(bulk.body.error.code).toBe('AUTHENTICATION_ERROR');

    const jobsList = await request(app).get('/scraper/jobs');
    expect(jobsList.status).toBe(401);
    expect(jobsList.body.error.code).toBe('AUTHENTICATION_ERROR');

    const job = await request(app).get('/scraper/jobs/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(job.status).toBe(401);
    expect(job.body.error.code).toBe('AUTHENTICATION_ERROR');

    const preview = await request(app).post('/scraper/preview').send({ url: 'https://example.com/' });
    expect(preview.status).toBe(401);
    expect(preview.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when unauthenticated even with x-test-role admin header (representative routes)', async () => {
    authEnabled = false;
    const app = await buildApp();

    const scrape = await request(app)
      .post('/scraper/scrape')
      .set('x-test-role', 'admin')
      .send({ url: 'https://example.com/' });
    expect(scrape.status).toBe(401);
    expect(scrape.body.error.code).toBe('AUTHENTICATION_ERROR');

    const jobsList = await request(app).get('/scraper/jobs').set('x-test-role', 'admin');
    expect(jobsList.status).toBe(401);
    expect(jobsList.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 400 for scrape when url is not a valid URL string', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/scraper/scrape')
      .send({ url: 'not-a-valid-url' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for scrape when javascript: URL is supplied', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/scraper/scrape')
      .send({ url: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for scrape when url contains ASCII control characters', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/scraper/scrape')
      .send({ url: 'https://exa\tmple.com/' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for bulk when urls array is empty', async () => {
    const app = await buildApp();
    const res = await request(app).post('/scraper/scrape/bulk').send({ urls: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for bulk when more than 50 URLs', async () => {
    const app = await buildApp();
    const urls = Array.from({ length: 51 }, (_, i) => `https://example.com/p${i}`);
    const res = await request(app).post('/scraper/scrape/bulk').send({ urls });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for bulk when a URL entry is invalid', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://ok.example/', 'ftp://bad.example/'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for preview when url fails validation', async () => {
    const app = await buildApp();
    const res = await request(app).post('/scraper/preview').send({ url: '///' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for scrape when maxDepth is out of range', async () => {
    const app = await buildApp();
    const tooHigh = await request(app)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', maxDepth: 99 });
    expect(tooHigh.status).toBe(400);
    expect(tooHigh.body.error.code).toBe('VALIDATION_ERROR');

    const tooLow = await request(app)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', maxDepth: 0 });
    expect(tooLow.status).toBe(400);
  });

  it('returns 400 for GET /jobs/:id when id is not a UUID', async () => {
    const app = await buildApp();
    const res = await request(app).get('/scraper/jobs/not-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for GET /jobs when query has unknown keys (strict)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/scraper/jobs').query({ sort: 'asc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

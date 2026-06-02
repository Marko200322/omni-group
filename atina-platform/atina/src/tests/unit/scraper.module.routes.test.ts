import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import axios from 'axios';
import * as db from '../../database/connection';
import { ScraperModule } from '../../modules/scraper/scraper.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('axios');
jest.mock('../../integrations', () => ({
  ...jest.requireActual('../../integrations'),
  getScraperClient: () => ({
    isConfigured: () => false,
    scrape: jest.fn().mockResolvedValue(null),
  }),
}));
jest.mock('../../queue/queue', () => ({
  addJob: jest.fn(),
}));
jest.mock('../../database/connection');

let scraperAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!scraperAuthOn) {
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

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const axiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

/** Fixed UUIDs for `GET /jobs/:id` (params schema requires `uuid()`). */
const SCRAPER_JOB_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const SCRAPER_JOB_ID_2 = 'b17fa0cc-ada8-4c1c-8812-4316d6dd78e2';

const sampleHtml = `<!doctype html><html><head>
<title>Page Title</title>
<meta name="description" content="Meta desc" />
</head><body>
<h1>Heading</h1>
<a href="https://example.org/out">out</a>
<a href="/relative">rel</a>
</body></html>`;

describe('ScraperModule HTTP routes', () => {
  let server: http.Server;
  let setTimeoutSpy: jest.SpyInstance;

  beforeAll(async () => {
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: (...args: unknown[]) => void) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);

    const app = express();
    app.use(express.json());
    const m = new ScraperModule();
    await m.initialize();
    app.use('/scraper', m.router);
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
    setTimeoutSpy.mockRestore();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    scraperAuthOn = true;
    jest.clearAllMocks();
    axiosGet.mockReset();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated GET /scraper/jobs', async () => {
    scraperAuthOn = false;
    const res = await request(server).get('/scraper/jobs');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /scraper/scrape', async () => {
    scraperAuthOn = false;
    const res = await request(server).post('/scraper/scrape').send({ url: 'https://example.com/' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /scraper/jobs/:id', async () => {
    scraperAuthOn = false;
    const res = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /scraper/scrape/bulk', async () => {
    scraperAuthOn = false;
    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://example.com/'] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /scraper/preview', async () => {
    scraperAuthOn = false;
    const res = await request(server).post('/scraper/preview').send({ url: 'https://example.com/' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated scraper routes even with x-test-role admin header', async () => {
    scraperAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/scraper/jobs').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/scraper/scrape').set(adminHdr).send({ url: 'https://example.com/' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();

    res = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/scraper/scrape/bulk')
      .set(adminHdr)
      .send({ urls: ['https://example.com/'] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();

    res = await request(server).post('/scraper/preview').set(adminHdr).send({ url: 'https://example.com/' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  function planWithScraper() {
    return { rows: [{ limits: { modules: ['scraper'] } }], rowCount: 1 } as never;
  }

  it('POST /scraper/scrape rejects when plan lacks scraper module', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ limits: { modules: ['crm'] } }],
      rowCount: 1,
    } as never);

    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/' });

    expect(res.status).toBe(402);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape rejects when user has no plan row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/' });

    expect(res.status).toBe(402);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/scraper/scrape')
      .query({ debug: '1' })
      .send({ url: 'https://example.com/' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape returns 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape/bulk returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .query({ parallel: '2' })
      .send({ urls: ['https://a.com/'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape/bulk returns 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://a.com/'], extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /scraper/preview returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/scraper/preview')
      .query({ raw: '1' })
      .send({ url: 'https://example.com/' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/preview returns 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/scraper/preview').send({ url: 'https://example.com/', hack: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape allows modules all', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ limits: { modules: 'all' } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 't-all' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet.mockResolvedValueOnce({
      data: sampleHtml,
      status: 200,
      headers: { 'content-type': 'text/html' },
    } as never);

    const res = await request(server)
      .post('/scraper/scrape')
      .send({
        url: 'https://example.com/',
        selectors: { custom: '(<h1[^>]*>)([^<]+)' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.result.title).toBe('Page Title');
    // Selector uses match[1] || match[0]; first capture group is the opening <h1> tag.
    expect(res.body.data.result.custom).toBe('<h1>');
  });

  it('POST /scraper/scrape completes scrape and updates task', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 't1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet.mockResolvedValueOnce({
      data: sampleHtml,
      status: 200,
      headers: {},
    } as never);

    const res = await request(server)
      .post('/scraper/scrape')
      .send({
        url: 'https://example.com/page',
        selectors: { tagless: 'Heading' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.taskId).toBe('t1');
    expect(res.body.data.result.links).toContain('https://example.org/out');
    expect(res.body.data.result.tagless).toBe('Heading');
    const updateSql = mockQuery.mock.calls[2][0] as string;
    expect(updateSql).toContain('completed');
  });

  it('POST /scraper/scrape handles minimal html, empty title, and unmatched selector', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 't-min' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet.mockResolvedValueOnce({
      data: '<html><body><p>x</p></body></html>',
      status: 200,
      headers: {},
    } as never);

    const res = await request(server)
      .post('/scraper/scrape')
      .send({
        url: 'https://minimal.example/',
        selectors: { ghost: 'zzzznotfound' },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.result.title).toBe('');
    expect(res.body.data.result.ghost).toBeNull();
  });

  it('POST /scraper/scrape marks task failed when axios throws', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 't2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet.mockRejectedValueOnce(new Error('network down'));

    const res = await request(server).post('/scraper/scrape').send({ url: 'https://example.com/fail' });

    expect(res.status).toBe(500);
    expect(mockQuery.mock.calls[2][0]).toContain('failed');
  });

  it('POST /scraper/scrape/bulk queues and completes background work', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 'bulk1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet.mockResolvedValue({
      data: '<html><title>T</title></html>',
      status: 200,
      headers: {},
    } as never);

    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://a.com/one'] });

    expect(res.status).toBe(201);
    await new Promise<void>((r) => setImmediate(r));
    const lastCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(lastCall[0]).toContain('completed');
  });

  it('POST /scraper/scrape/bulk records per-url errors in results', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 'bulk-mix' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    axiosGet
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({
        data: '<html><title>OK</title></html>',
        status: 200,
        headers: {},
      } as never);

    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://fail.example/', 'https://ok.example/'] });

    expect(res.status).toBe(201);
    await new Promise<void>((r) => setImmediate(r));
    const completed = mockQuery.mock.calls.find((c) => (c[0] as string).includes('completed'));
    expect(completed).toBeDefined();
    const payload = JSON.parse((completed![1] as unknown[])[1] as string);
    expect(payload.results[0]).toMatchObject({ error: 'first failed' });
    expect(payload.results[1]).toMatchObject({ title: 'OK' });
  });

  it('POST /scraper/scrape/bulk background failure updates task', async () => {
    mockQuery
      .mockResolvedValueOnce(planWithScraper())
      .mockResolvedValueOnce({ rows: [{ id: 'bulk2' }], rowCount: 1 } as never)
      .mockRejectedValueOnce(new Error('db running'))
      .mockResolvedValue({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/scraper/scrape/bulk')
      .send({ urls: ['https://b.com/'] });

    expect(res.status).toBe(201);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    const failedUpdate = mockQuery.mock.calls.find((c) => (c[0] as string).includes('failed'));
    expect(failedUpdate).toBeDefined();
  });

  it('GET /scraper/jobs/:id returns row or 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: SCRAPER_JOB_ID }], rowCount: 1 } as never);
    const ok = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID}`);
    expect(ok.status).toBe(200);

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const missing = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID_2}`);
    expect(missing.status).toBe(404);
  });

  it('GET /scraper/jobs/:id returns 400 when id is not a UUID', async () => {
    const res = await request(server).get('/scraper/jobs/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /scraper/jobs uses default pagination', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'j' }], rowCount: 1 } as never);
    const res = await request(server).get('/scraper/jobs');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['u1', 20, 0]);
  });

  it('GET /scraper/jobs respects page and limit query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/scraper/jobs').query({ page: 3, limit: 15 });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['u1', 15, 30]);
  });

  it('GET /scraper/jobs returns 400 when limit exceeds cap (strict query)', async () => {
    const res = await request(server).get('/scraper/jobs').query({ limit: 101 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /scraper/jobs returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server).get('/scraper/jobs').query({ page: 1, extra: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /scraper/scrape returns 400 when selectors exceed max key count', async () => {
    const selectors = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${i}`, 'a']));
    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', selectors });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /scraper/scrape returns 400 when selector pattern is too long', async () => {
    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', selectors: { a: 'x'.repeat(501) } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /scraper/scrape returns 400 when serialized selectors exceed JSON char cap', async () => {
    const selectors = Object.fromEntries(
      Array.from({ length: 17 }, (_, i) => [`s${i}`, 'y'.repeat(500)])
    );
    const res = await request(server)
      .post('/scraper/scrape')
      .send({ url: 'https://example.com/', selectors });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /scraper/preview success and error paths', async () => {
    axiosGet.mockResolvedValueOnce({
      data: sampleHtml,
      status: 200,
      headers: { 'content-type': 'text/html' },
    } as never);

    const ok = await request(server).post('/scraper/preview').send({ url: 'https://preview.ok/' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.title).toBe('Page Title');

    axiosGet.mockRejectedValueOnce(new Error('timeout'));
    const bad = await request(server).post('/scraper/preview').send({ url: 'https://preview.bad/' });
    expect(bad.status).toBe(200);
    expect(bad.body.data.accessible).toBe(false);
  });

  it('GET /scraper/jobs returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/scraper/jobs').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /scraper/jobs returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/scraper/jobs').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /scraper/jobs uses catch-default page when page is not numeric', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/scraper/jobs').query({ page: 'nope', limit: '25' });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['u1', 25, 0]);
  });

  it('GET /scraper/jobs/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID}`).query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /scraper/jobs/:id returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get(`/scraper/jobs/${SCRAPER_JOB_ID}`).send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape/bulk returns 400 when urls array is empty', async () => {
    const res = await request(server).post('/scraper/scrape/bulk').send({ urls: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape/bulk returns 400 when urls array exceeds max', async () => {
    const urls = Array.from({ length: 51 }, (_, i) => `https://example.com/p${i}`);
    const res = await request(server).post('/scraper/scrape/bulk').send({ urls });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /scraper/scrape returns 400 when maxDepth is out of range', async () => {
    const res = await request(server).post('/scraper/scrape').send({ url: 'https://example.com/', maxDepth: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalled();
  });
});

import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

let authEnabled = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
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

import { TemplateEngineModule } from '../../../../modules/template-engine/template-engine.module';
import { TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH } from '../../../../modules/template-engine/template-engine.constants';

describe('TemplateEngineModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TemplateEngineModule();
    await m.initialize();
    app.use('/template-engine', m.router);
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
  });

  it('GET /status returns ok when authenticated', async () => {
    const res = await request(server).get('/template-engine/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ ok: true, slug: 'template-engine' });
  });

  it('GET /status returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const res = await request(server).get('/template-engine/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /status returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/template-engine/status').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /render returns rendered string', async () => {
    const res = await request(server)
      .post('/template-engine/render')
      .send({ template: 'Hi {{name}}', variables: { name: 'Bo' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ rendered: 'Hi Bo' });
  });

  it('POST /render substitutes several placeholders in one pass', async () => {
    const res = await request(server)
      .post('/template-engine/render')
      .send({
        template: '{{greeting}} {{name}}, id={{id}}',
        variables: { greeting: 'Hello', name: 'Bo', id: '7' },
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ rendered: 'Hello Bo, id=7' });
  });

  it('POST /render defaults variables when omitted', async () => {
    const res = await request(server).post('/template-engine/render').send({ template: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ rendered: 'x' });
  });

  it('POST /render rejects invalid body', async () => {
    const res = await request(server).post('/template-engine/render').send({ template: 123 });
    expect(res.status).toBe(400);
  });

  it('POST /render rejects non-string variable values', async () => {
    const res = await request(server)
      .post('/template-engine/render')
      .send({ template: '{{n}}', variables: { n: 2 } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /render rejects template longer than cap', async () => {
    const res = await request(server)
      .post('/template-engine/render')
      .send({ template: 'x'.repeat(TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH + 1), variables: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /render returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const res = await request(server).post('/template-engine/render').send({ template: 'a' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /render returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/template-engine/render')
      .set('x-test-role', 'admin')
      .send({ template: 'a' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /template-engine/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/template-engine/status').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /template-engine/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/template-engine/status').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /template-engine/render returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/template-engine/render')
      .query({ cache: '0' })
      .send({ template: 'Hi' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /template-engine/render returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/template-engine/render').send({ template: 'x', variables: {}, extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

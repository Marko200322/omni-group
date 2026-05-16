import express from 'express';
import request from 'supertest';
import { z, ZodSchema } from 'zod';
import 'express-async-errors';
import { validate, validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/body', validateBody(z.object({ name: z.string() })), (req, res) => {
    res.json({ ok: true, body: req.body });
  });
  app.get('/query', validateQuery(z.object({ q: z.string() })), (req, res) => {
    res.json({ ok: true, query: req.query });
  });
  app.get('/params/:id', validateParams(z.object({ id: z.string().uuid() })), (req, res) => {
    res.json({ ok: true, params: req.params });
  });
  const nonZodSchema = {
    parse: () => {
      throw new Error('not a ZodError');
    },
  } as unknown as ZodSchema;
  app.post('/non-zod', validate(nonZodSchema), (_req, res) => {
    res.json({ ok: true });
  });
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code, err.details);
    }
    res.status(500).json({ message: err.message });
  });
  return app;
}

describe('validate middleware', () => {
  const app = buildApp();

  it('validateBody passes parsed body', async () => {
    const res = await request(app).post('/body').send({ name: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ name: 'x' });
  });

  it('validateBody throws ValidationError on Zod failure', async () => {
    const res = await request(app).post('/body').send({});
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error?.details)).toBe(true);
    expect(res.body.error?.details[0]).toEqual(
      expect.objectContaining({ field: 'name' })
    );
  });

  it('validateQuery parses query', async () => {
    const res = await request(app).get('/query').query({ q: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.query).toEqual({ q: 'hi' });
  });

  it('validateParams parses uuid param', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const res = await request(app).get(`/params/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.params.id).toBe(id);
  });

  it('validate forwards non-Zod errors to next', async () => {
    const res = await request(app).post('/non-zod').send({});
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('not a ZodError');
  });
});

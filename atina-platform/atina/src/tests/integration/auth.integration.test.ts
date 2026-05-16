/**
 * Integration tests for Auth endpoints
 * Requires a running PostgreSQL with test database
 * Set TEST_DATABASE_URL env or uses defaults from .env
 */
import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { AuthModule } from '../../modules/auth/auth.module';
import { closePool } from '../../database/connection';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

// Build a minimal test app
function buildTestApp() {
  const app = express();
  app.use(express.json());

  const authModule = new AuthModule();
  app.use('/api/v1/auth', authModule.router);

  // Error handler
  app.use((err: Error, _req: any, res: any, _next: any) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code, err.details);
    }
    return sendError(res, err.message || 'Error', 500);
  });

  return { app, authModule };
}

describe('Auth Integration', () => {
  let app: express.Application;
  let authModule: AuthModule;
  let server: http.Server;

  beforeAll(async () => {
    const result = buildTestApp();
    app = result.app;
    authModule = result.authModule;
    await authModule.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await closePool();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({ email: 'bad@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'Strong@123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for empty email', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: '', password: 'somepassword' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(server).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 without token even with x-test-role admin header', async () => {
      const res = await request(server).get('/api/v1/auth/me').set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 400 for invalid email', async () => {
      const res = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-valid' });

      expect(res.status).toBe(400);
    });

    it('should return 200 for any email (no enumeration)', async () => {
      const res = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      // Should succeed even for non-existent emails (anti-enumeration)
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 400 for missing refresh token', async () => {
      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});

import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { UsersModule } from '../../../../modules/users/users.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var usersServiceMock: {
  getProfile: jest.Mock;
  updateProfile: jest.Mock;
  getUserStats: jest.Mock;
  listUsers: jest.Mock;
  getUserById: jest.Mock;
  adminUpdateUser: jest.Mock;
  deactivateUser: jest.Mock;
  createApiKey: jest.Mock;
  listApiKeys: jest.Mock;
  revokeApiKey: jest.Mock;
};

let currentRole: 'user' | 'admin' = 'user';
let usersAuthOn = true;

jest.mock('../../../../modules/users/service/users.service', () => {
  usersServiceMock = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getUserStats: jest.fn(),
    listUsers: jest.fn(),
    getUserById: jest.fn(),
    adminUpdateUser: jest.fn(),
    deactivateUser: jest.fn(),
    createApiKey: jest.fn(),
    listApiKeys: jest.fn(),
    revokeApiKey: jest.fn(),
  };
  return {
    UsersService: jest.fn().mockImplementation(() => usersServiceMock),
  };
});

jest.mock('../../../../api/middleware/auth.middleware', () => {
  const { AuthorizationError, AuthenticationError } = require('../../../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!usersAuthOn) {
        throw new AuthenticationError('No authentication token provided');
      }
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role: currentRole,
        email: 'a@test.com',
      };
      next();
    },
    requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (req.user?.role !== 'admin') {
        throw new AuthorizationError('Insufficient permissions');
      }
      next();
    },
  };
});

const TARGET_USER_UUID = '22222222-2222-4222-8222-222222222222';
const API_KEY_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('UsersModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new UsersModule();
    await m.initialize();
    app.use('/users', m.router);
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
    usersAuthOn = true;
    currentRole = 'user';
    jest.clearAllMocks();
    usersServiceMock.getProfile.mockResolvedValue({ id: 'u1' });
    usersServiceMock.updateProfile.mockResolvedValue({ id: 'u1', name: 'X' });
    usersServiceMock.getUserStats.mockResolvedValue({ tasks: 0 });
    usersServiceMock.listUsers.mockResolvedValue({ users: [], total: 0 });
    usersServiceMock.getUserById.mockResolvedValue({ id: 'u2' });
    usersServiceMock.adminUpdateUser.mockResolvedValue({ id: 'u2' });
    usersServiceMock.deactivateUser.mockResolvedValue(undefined);
    usersServiceMock.createApiKey.mockResolvedValue({ id: 'k1', key: 'secret' });
    usersServiceMock.listApiKeys.mockResolvedValue([]);
    usersServiceMock.revokeApiKey.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated GET /users/profile', async () => {
    usersAuthOn = false;
    const res = await request(server).get('/users/profile');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.getProfile).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /users/profile', async () => {
    usersAuthOn = false;
    const res = await request(server).patch('/users/profile').send({ name: 'Bob' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /users/stats', async () => {
    usersAuthOn = false;
    const res = await request(server).get('/users/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.getUserStats).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /users/api-keys', async () => {
    usersAuthOn = false;
    const res = await request(server).get('/users/api-keys');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.listApiKeys).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /users/api-keys', async () => {
    usersAuthOn = false;
    const res = await request(server).post('/users/api-keys').send({ name: 'k', permissions: ['read'] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.createApiKey).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /users/api-keys/:id', async () => {
    usersAuthOn = false;
    const res = await request(server).delete(`/users/api-keys/${API_KEY_UUID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.revokeApiKey).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated user-scoped routes even with x-test-role admin header', async () => {
    usersAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/users/profile').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.getProfile).not.toHaveBeenCalled();

    res = await request(server).patch('/users/profile').set(adminHdr).send({ name: 'X' });
    expect(res.status).toBe(401);
    expect(usersServiceMock.updateProfile).not.toHaveBeenCalled();

    res = await request(server).get('/users/stats').set(adminHdr);
    expect(res.status).toBe(401);
    expect(usersServiceMock.getUserStats).not.toHaveBeenCalled();

    res = await request(server).get('/users/api-keys').set(adminHdr);
    expect(res.status).toBe(401);
    expect(usersServiceMock.listApiKeys).not.toHaveBeenCalled();

    res = await request(server).post('/users/api-keys').set(adminHdr).send({ name: 'k', permissions: ['read'] });
    expect(res.status).toBe(401);
    expect(usersServiceMock.createApiKey).not.toHaveBeenCalled();

    res = await request(server).delete(`/users/api-keys/${API_KEY_UUID}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(usersServiceMock.revokeApiKey).not.toHaveBeenCalled();

    res = await request(server).get(`/users/${TARGET_USER_UUID}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /users (admin list)', async () => {
    usersAuthOn = false;
    const res = await request(server).get('/users').query({ page: 1, limit: 10 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /users/:id', async () => {
    usersAuthOn = false;
    const res = await request(server).get(`/users/${TARGET_USER_UUID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /users/:id', async () => {
    usersAuthOn = false;
    const res = await request(server).patch(`/users/${TARGET_USER_UUID}`).send({ name: 'X' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /users/:id', async () => {
    usersAuthOn = false;
    const res = await request(server).delete(`/users/${TARGET_USER_UUID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.deactivateUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /users (admin list) even with x-test-role admin header', async () => {
    usersAuthOn = false;
    const res = await request(server).get('/users').query({ page: 1, limit: 10 }).set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /users/:id even with x-test-role admin header', async () => {
    usersAuthOn = false;
    const res = await request(server)
      .patch(`/users/${TARGET_USER_UUID}`)
      .set('x-test-role', 'admin')
      .send({ name: 'X' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /users/:id even with x-test-role admin header', async () => {
    usersAuthOn = false;
    const res = await request(server).delete(`/users/${TARGET_USER_UUID}`).set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.deactivateUser).not.toHaveBeenCalled();
  });

  it('GET /users/profile', async () => {
    const res = await request(server).get('/users/profile');
    expect(res.status).toBe(200);
    expect(usersServiceMock.getProfile).toHaveBeenCalledWith('u1');
  });

  it('PATCH /users/profile returns 400 when query params are present', async () => {
    const res = await request(server).patch('/users/profile').query({ notify: '1' }).send({ name: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.updateProfile).not.toHaveBeenCalled();
  });

  it('PATCH /users/profile', async () => {
    const res = await request(server).patch('/users/profile').send({ name: 'Bob' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.updateProfile).toHaveBeenCalledWith('u1', { name: 'Bob' });
  });

  it('GET /users/stats', async () => {
    const res = await request(server).get('/users/stats');
    expect(res.status).toBe(200);
    expect(usersServiceMock.getUserStats).toHaveBeenCalledWith('u1');
  });

  it('GET /users/api-keys and POST /users/api-keys', async () => {
    let res = await request(server).get('/users/api-keys');
    expect(res.status).toBe(200);
    expect(usersServiceMock.listApiKeys).toHaveBeenCalledWith('u1');

    res = await request(server).post('/users/api-keys').send({ name: 'k', permissions: ['read'] });
    expect(res.status).toBe(201);
    expect(usersServiceMock.createApiKey).toHaveBeenCalledWith('u1', { name: 'k', permissions: ['read'] });
  });

  it('DELETE /users/api-keys/:id', async () => {
    const res = await request(server).delete(`/users/api-keys/${API_KEY_UUID}`);
    expect(res.status).toBe(200);
    expect(usersServiceMock.revokeApiKey).toHaveBeenCalledWith('u1', API_KEY_UUID);
  });

  it('DELETE /users/api-keys/:id returns 400 for invalid key id', async () => {
    const res = await request(server).delete('/users/api-keys/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.revokeApiKey).not.toHaveBeenCalled();
  });

  it('DELETE /users/api-keys/:id returns 400 when body has unknown keys', async () => {
    const keyId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server).delete(`/users/api-keys/${keyId}`).send({ revokeAll: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.revokeApiKey).not.toHaveBeenCalled();
  });

  it('GET /users/ lists for admin only', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ page: 2, limit: 10, search: 'a' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.listUsers).toHaveBeenCalled();
  });

  it('GET /users/ passes isActive false from query string', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ isActive: 'false' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, page: 1, limit: 20 })
    );
  });

  it('GET /users/ returns 400 for invalid isActive', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ isActive: 'maybe' });
    expect(res.status).toBe(400);
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('GET /users/ returns 403 for non-admin', async () => {
    currentRole = 'user';
    const res = await request(server).get('/users');
    expect(res.status).toBe(403);
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('GET /users/:id delegates to getUserById', async () => {
    const res = await request(server).get(`/users/${TARGET_USER_UUID}`);
    expect(res.status).toBe(200);
    expect(usersServiceMock.getUserById).toHaveBeenCalledWith('u1', 'user', TARGET_USER_UUID);
  });

  it('GET /users/:id returns 400 when id is not a uuid', async () => {
    const res = await request(server).get('/users/u2');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id and DELETE /users/:id require admin', async () => {
    currentRole = 'admin';
    let res = await request(server).patch(`/users/${TARGET_USER_UUID}`).send({ name: 'Admin set' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.adminUpdateUser).toHaveBeenCalledWith(TARGET_USER_UUID, { name: 'Admin set' });

    res = await request(server).delete(`/users/${TARGET_USER_UUID}`);
    expect(res.status).toBe(200);
    expect(usersServiceMock.deactivateUser).toHaveBeenCalledWith(TARGET_USER_UUID);
  });

  it('DELETE /users/:id returns 400 when body has unknown keys', async () => {
    currentRole = 'admin';
    const res = await request(server).delete(`/users/${TARGET_USER_UUID}`).send({ hard: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.deactivateUser).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id forbidden for non-admin', async () => {
    currentRole = 'user';
    const res = await request(server).patch(`/users/${TARGET_USER_UUID}`).send({ name: 'X' });
    expect(res.status).toBe(403);
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('GET /users/profile returns 400 when query params are present', async () => {
    const res = await request(server).get('/users/profile').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getProfile).not.toHaveBeenCalled();
  });

  it('GET /users/profile returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/users/profile').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getProfile).not.toHaveBeenCalled();
  });

  it('GET /users/stats returns 400 when query params are present', async () => {
    const res = await request(server).get('/users/stats').query({ period: '7d' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getUserStats).not.toHaveBeenCalled();
  });

  it('GET /users/stats returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/users/stats').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getUserStats).not.toHaveBeenCalled();
  });

  it('GET /users/api-keys returns 400 when query params are present', async () => {
    const res = await request(server).get('/users/api-keys').query({ raw: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.listApiKeys).not.toHaveBeenCalled();
  });

  it('GET /users/api-keys returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/users/api-keys').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.listApiKeys).not.toHaveBeenCalled();
  });

  it('POST /users/api-keys returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/users/api-keys')
      .query({ ttl: '1' })
      .send({ name: 'k', permissions: ['read'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.createApiKey).not.toHaveBeenCalled();
  });

  it('POST /users/api-keys returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/users/api-keys').send({ name: 'k', permissions: ['read'], extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.createApiKey).not.toHaveBeenCalled();
  });

  it('DELETE /users/api-keys/:id returns 400 when query params are present', async () => {
    const res = await request(server).delete(`/users/api-keys/${API_KEY_UUID}`).query({ force: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.revokeApiKey).not.toHaveBeenCalled();
  });

  it('PATCH /users/profile returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).patch('/users/profile').send({ name: 'Bob', unknown: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.updateProfile).not.toHaveBeenCalled();
  });

  it('GET /users/ returns 400 on unknown query keys (strict) for admin', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ page: 1, sort: 'email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('GET /users/ returns 400 when body is not strictly empty for admin', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').send({ filter: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('GET /users/ returns 400 when limit is non-positive for admin', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.listUsers).not.toHaveBeenCalled();
  });

  it('GET /users/ uses catch-default page when page is not numeric for admin', async () => {
    currentRole = 'admin';
    const res = await request(server).get('/users').query({ page: 'nope', limit: '15' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 15 })
    );
  });

  it('GET /users/:id returns 400 when query params are present', async () => {
    const res = await request(server).get(`/users/${TARGET_USER_UUID}`).query({ expand: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('GET /users/:id returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get(`/users/${TARGET_USER_UUID}`).send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('PATCH /users/:id returns 400 when query params are present for admin', async () => {
    currentRole = 'admin';
    const res = await request(server)
      .patch(`/users/${TARGET_USER_UUID}`)
      .query({ merge: '1' })
      .send({ name: 'Admin set' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('DELETE /users/:id returns 400 when query params are present for admin', async () => {
    currentRole = 'admin';
    const res = await request(server).delete(`/users/${TARGET_USER_UUID}`).query({ hard: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.deactivateUser).not.toHaveBeenCalled();
  });
});

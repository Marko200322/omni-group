import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { UsersModule } from '../../../../modules/users/users.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var usersServiceMock: {
  adminUpdateUser: jest.Mock;
};

jest.mock('../../../../modules/users/service/users.service', () => {
  usersServiceMock = {
    adminUpdateUser: jest.fn(),
  };
  return {
    UsersService: jest.fn().mockImplementation(() => usersServiceMock),
  };
});

let usersAdminPatchAuthOn = true;

jest.mock('../../../../api/middleware/auth.middleware', () => {
  const { AuthorizationError, AuthenticationError } = require('../../../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!usersAdminPatchAuthOn) {
        throw new AuthenticationError('No authentication token provided');
      }
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role: 'admin',
        email: 'admin@test.com',
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

describe('UsersModule PATCH /users/:id — body validation (no validateBody mock)', () => {
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
    usersAdminPatchAuthOn = true;
    jest.clearAllMocks();
    usersServiceMock.adminUpdateUser.mockResolvedValue({ id: 'u2' });
  });

  it('returns 401 when unauthenticated', async () => {
    usersAdminPatchAuthOn = false;
    const res = await request(server).patch(`/users/${TARGET_USER_UUID}`).send({ name: 'Ok' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated even with x-test-role admin header', async () => {
    usersAdminPatchAuthOn = false;
    const res = await request(server)
      .patch(`/users/${TARGET_USER_UUID}`)
      .set('x-test-role', 'admin')
      .send({ name: 'Ok' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('returns 400 when body contains unknown keys', async () => {
    const res = await request(server)
      .patch(`/users/${TARGET_USER_UUID}`)
      .send({ name: 'Ok', unexpected: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('returns 400 when query params are present', async () => {
    const res = await request(server)
      .patch(`/users/${TARGET_USER_UUID}`)
      .query({ x: '1' })
      .send({ name: 'Ok' });
    expect(res.status).toBe(400);
    expect(usersServiceMock.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('calls service when body is valid', async () => {
    const res = await request(server).patch(`/users/${TARGET_USER_UUID}`).send({ name: 'Valid' });
    expect(res.status).toBe(200);
    expect(usersServiceMock.adminUpdateUser).toHaveBeenCalledWith(TARGET_USER_UUID, { name: 'Valid' });
  });
});

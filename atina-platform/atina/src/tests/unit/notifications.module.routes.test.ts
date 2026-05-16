import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var notifSmtpRoutes: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  fromName: string;
};

jest.mock('../../config', () => {
  const actual = jest.requireActual<typeof import('../../config')>('../../config');
  notifSmtpRoutes = {
    host: 'localhost',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: 'noreply@test.io',
    fromName: 'ATINA Test',
  };
  return {
    config: {
      ...actual.config,
      smtp: notifSmtpRoutes,
    },
  };
});

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      verify: jest.fn(() => Promise.resolve()),
      sendMail: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock('../../database/connection');

let notifAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!notifAuthOn) {
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

describe('NotificationsModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ strict: false }));
    const m = new NotificationsModule();
    await m.initialize();
    app.use('/notifications', m.router);
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
    notifAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  const validNotifId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it('rejects unauthenticated GET /notifications', async () => {
    notifAuthOn = false;
    const res = await request(server).get('/notifications');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /notifications/:id/read', async () => {
    notifAuthOn = false;
    const res = await request(server).patch(`/notifications/${validNotifId}/read`);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated PATCH /notifications/read-all', async () => {
    notifAuthOn = false;
    const res = await request(server).patch('/notifications/read-all').send({});
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated DELETE /notifications/:id', async () => {
    notifAuthOn = false;
    const res = await request(server).delete(`/notifications/${validNotifId}`);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /notifications/unread-count', async () => {
    notifAuthOn = false;
    const res = await request(server).get('/notifications/unread-count');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated notification routes even with x-test-role admin header', async () => {
    notifAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/notifications').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).patch(`/notifications/${validNotifId}/read`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).patch('/notifications/read-all').set(adminHdr).send({});
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).delete(`/notifications/${validNotifId}`).set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/notifications/unread-count').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications lists with defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'n1' }], rowCount: 1 } as never);

    const res = await request(server).get('/notifications');
    expect(res.status).toBe(200);
    expect(res.body.meta?.total).toBe(3);
  });

  it('GET /notifications filters unreadOnly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'n1', is_read: false }], rowCount: 1 } as never);

    const res = await request(server).get('/notifications').query({ unreadOnly: 'true', limit: 10 });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('is_read = false');
  });

  it('GET /notifications with unreadOnly false does not add is_read filter', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'n1' }, { id: 'n2' }], rowCount: 2 } as never);

    const res = await request(server).get('/notifications').query({ unreadOnly: 'false' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).not.toContain('is_read = false');
    expect(res.body.meta?.total).toBe(2);
  });

  it('GET /notifications accepts limit at max 100', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/notifications').query({ limit: '100', page: '1' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 100, 0]);
  });

  it('PATCH /notifications/:id/read', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const res = await request(server).patch(`/notifications/${validNotifId}/read`);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([validNotifId, 'u1']);
  });

  it('PATCH /notifications/read-all', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 } as never);
    const res = await request(server).patch('/notifications/read-all');
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
  });

  it('DELETE /notifications/:id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const res = await request(server).delete(`/notifications/${validNotifId}`);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([validNotifId, 'u1']);
  });

  it('GET /notifications returns 400 VALIDATION_ERROR when page is invalid', async () => {
    const res = await request(server).get('/notifications').query({ page: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /notifications returns 400 VALIDATION_ERROR when limit exceeds max', async () => {
    const res = await request(server).get('/notifications').query({ limit: '500' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /notifications returns 400 VALIDATION_ERROR when unreadOnly is invalid', async () => {
    const res = await request(server).get('/notifications').query({ unreadOnly: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /notifications returns 400 VALIDATION_ERROR when unknown query key is present', async () => {
    const res = await request(server).get('/notifications').query({ page: '1', limit: '10', extra: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications/unread-count returns 400 VALIDATION_ERROR when query params are present', async () => {
    const res = await request(server).get('/notifications/unread-count').query({ foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications treats empty string page/limit as defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/notifications').query({ page: '', limit: '' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][0]).toContain('LIMIT $2 OFFSET $3');
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 20, 0]);
  });

  it('GET /notifications page 2 passes OFFSET from page and limit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'n20' }], rowCount: 1 } as never);
    const res = await request(server).get('/notifications').query({ page: '2', limit: '20' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual(['u1', 20, 20]);
  });

  it('PATCH /notifications/:id/read returns 400 for non-uuid id', async () => {
    const res = await request(server).patch('/notifications/not-a-uuid/read');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /notifications/:id returns 400 for non-uuid id', async () => {
    const res = await request(server).delete('/notifications/bad-id');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /notifications/:id returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .delete(`/notifications/${validNotifId}`)
      .send({ force: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /notifications/:id/read returns 400 when body has unknown keys', async () => {
    const res = await request(server)
      .patch(`/notifications/${validNotifId}/read`)
      .send({ extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /notifications/:id/read returns 400 when query string is present', async () => {
    const res = await request(server).patch(`/notifications/${validNotifId}/read`).query({ x: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /notifications/read-all returns 400 when query string is present', async () => {
    const res = await request(server).patch('/notifications/read-all').query({ force: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('DELETE /notifications/:id returns 400 when query string is present', async () => {
    const res = await request(server).delete(`/notifications/${validNotifId}`).query({ soft: 'true' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /notifications/:id/read accepts empty object body (strict empty schema)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const res = await request(server)
      .patch(`/notifications/${validNotifId}/read`)
      .send({});
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('PATCH /notifications/:id/read accepts JSON null body (preprocess to empty object)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const res = await request(server)
      .patch(`/notifications/${validNotifId}/read`)
      .set('Content-Type', 'application/json')
      .send('null');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('PATCH /notifications/read-all returns 400 when body has unknown keys', async () => {
    const res = await request(server).patch('/notifications/read-all').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /notifications/read-all accepts JSON null body', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 } as never);
    const res = await request(server)
      .patch('/notifications/read-all')
      .set('Content-Type', 'application/json')
      .send('null');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('PATCH /notifications/read-all accepts empty object body', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const res = await request(server).patch('/notifications/read-all').send({});
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1']);
  });

  it('GET /notifications/unread-count', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as never);
    const res = await request(server).get('/notifications/unread-count');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ count: 5 });
  });

  it('GET /notifications returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/notifications').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications/unread-count returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/notifications/unread-count').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/notifications').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications returns 400 when page is not coercible to a valid integer', async () => {
    const res = await request(server).get('/notifications').query({ page: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /notifications returns 400 when limit is not coercible to a valid integer', async () => {
    const res = await request(server).get('/notifications').query({ limit: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

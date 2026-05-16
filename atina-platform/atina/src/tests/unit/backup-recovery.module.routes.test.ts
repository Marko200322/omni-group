import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { BackupRecoveryModule } from '../../modules/backup-recovery/backup-recovery.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var backupRepo: {
  create: jest.Mock;
  list: jest.Mock;
  getById: jest.Mock;
};

jest.mock('../../modules/backup-recovery/repository/backup-recovery.repository', () => {
  backupRepo = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
  };
  return {
    BackupRecoveryRepository: jest.fn().mockImplementation(() => backupRepo),
  };
});

let brAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!brAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'admin-1',
      role,
      email: 'admin@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const u = (req as express.Request & { user?: { role: string } }).user;
    if (u?.role !== 'admin') {
      return res.status(403).json({ success: false });
    }
    next();
  },
}));

describe('BackupRecoveryModule HTTP routes', () => {
  let server: http.Server;
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new BackupRecoveryModule();
    await m.initialize();
    app.use('/backup-recovery', m.router);
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
    brAuthOn = true;
    jest.clearAllMocks();
    backupRepo.list.mockResolvedValue({ rows: [{ id: 's1' }], rowCount: 1 });
    backupRepo.create.mockResolvedValue({ rows: [{ id: 'new-snap' }], rowCount: 1 });
    backupRepo.getById.mockResolvedValue({ rows: [{ id: validUuid }], rowCount: 1 });
  });

  it('GET / lists backups', async () => {
    const res = await request(server).get('/backup-recovery');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [{ id: 's1' }] });
    expect(backupRepo.list).toHaveBeenCalledWith(50);
  });

  it('GET / passes coerced limit query', async () => {
    const res = await request(server).get('/backup-recovery').query({ limit: '25' });
    expect(res.status).toBe(200);
    expect(backupRepo.list).toHaveBeenCalledWith(25);
  });

  it('GET / returns validation error for unknown query keys', async () => {
    const res = await request(server).get('/backup-recovery').query({ limit: '10', extra: '1' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(backupRepo.list).not.toHaveBeenCalled();
  });

  it('GET / returns 400 when JSON body has unknown keys', async () => {
    const res = await request(server)
      .get('/backup-recovery')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filter: 'all' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(backupRepo.list).not.toHaveBeenCalled();
  });

  it('POST /snapshot returns 400 when query params are present', async () => {
    const res = await request(server).post('/backup-recovery/snapshot').query({ force: '1' }).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(backupRepo.create).not.toHaveBeenCalled();
  });

  it('POST /snapshot returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/backup-recovery/snapshot').send({ snapshotType: 'manual', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(backupRepo.create).not.toHaveBeenCalled();
  });

  it('POST /restore returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/backup-recovery/restore')
      .query({ async: '1' })
      .send({ snapshotId: validUuid, reason: 'Disaster recovery test' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(backupRepo.getById).not.toHaveBeenCalled();
  });

  it('GET / returns 403 for non-admin', async () => {
    const res = await request(server).get('/backup-recovery').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(backupRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /', async () => {
    brAuthOn = false;
    const res = await request(server).get('/backup-recovery');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /snapshot', async () => {
    brAuthOn = false;
    const res = await request(server).post('/backup-recovery/snapshot').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /restore', async () => {
    brAuthOn = false;
    const res = await request(server)
      .post('/backup-recovery/restore')
      .send({ snapshotId: validUuid, reason: 'Disaster recovery test' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.getById).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET / even with x-test-role admin header', async () => {
    brAuthOn = false;
    const res = await request(server).get('/backup-recovery').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /snapshot even with x-test-role admin header', async () => {
    brAuthOn = false;
    const res = await request(server).post('/backup-recovery/snapshot').set('x-test-role', 'admin').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /restore even with x-test-role admin header', async () => {
    brAuthOn = false;
    const res = await request(server)
      .post('/backup-recovery/restore')
      .set('x-test-role', 'admin')
      .send({ snapshotId: validUuid, reason: 'Disaster recovery test' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(backupRepo.getById).not.toHaveBeenCalled();
  });

  it('POST /snapshot creates with validated defaults', async () => {
    const res = await request(server).post('/backup-recovery/snapshot').send({});
    expect(res.status).toBe(201);
    expect(backupRepo.create).toHaveBeenCalledWith('admin-1', 'manual', {});
  });

  it('POST /restore queues restore for valid body', async () => {
    const res = await request(server)
      .post('/backup-recovery/restore')
      .send({ snapshotId: validUuid, reason: 'Disaster recovery test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      snapshotId: validUuid,
      status: 'accepted',
      reason: 'Disaster recovery test',
    });
  });

  it('POST /restore returns validation error for invalid uuid', async () => {
    const res = await request(server)
      .post('/backup-recovery/restore')
      .send({ snapshotId: 'bad', reason: 'too short' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});

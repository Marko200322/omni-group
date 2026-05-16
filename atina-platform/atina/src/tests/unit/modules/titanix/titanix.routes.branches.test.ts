import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanixModule } from '../../../../modules/titanix/titanix.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';
import * as queue from '../../../../queue/queue';

// eslint-disable-next-line no-var
var titanixRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  insertTask: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/titanix/repository/titanix.repository', () => {
  titanixRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    insertTask: jest.fn().mockResolvedValue({ rows: [{ id: 'task-http' }] }),
    insertRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    TitanixRepository: jest.fn().mockImplementation(() => titanixRepo),
  };
});

jest.mock('../../../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

const mockAddJob = queue.addJob as jest.MockedFunction<typeof queue.addJob>;

describe('TitanixModule HTTP branches', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanixModule();
    await m.initialize();
    app.use('/titanix', m.router);
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
    jest.clearAllMocks();
    titanixRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    titanixRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    titanixRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    titanixRepo.insertTask.mockResolvedValue({ rows: [{ id: 'task-http' }] });
    titanixRepo.insertRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    titanixRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('POST /titanix rejects short workspace name', async () => {
    const res = await request(server).post('/titanix').send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run rejects jobs below minimum', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 0 });
    expect(res.status).toBe(400);
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run rejects jobs above maximum', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 201 });
    expect(res.status).toBe(400);
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run rejects invalid workspace id in path', async () => {
    const res = await request(server).post('/titanix/bad.id/run').send({ pipeline: 'ops', jobs: 1 });
    expect(res.status).toBe(400);
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run returns 500 when run row cannot be persisted', async () => {
    titanixRepo.insertRun.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 1 });
    expect(res.status).toBe(500);
    expect(res.body.error?.code).toBe('TITANIX_RUN_PERSIST_FAILED');
  });
});

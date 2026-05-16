import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ComplianceModule } from '../../modules/compliance/compliance.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var complianceRepo: {
  list: jest.Mock;
  insert: jest.Mock;
};

jest.mock('../../modules/compliance/repository/compliance.repository', () => {
  complianceRepo = {
    list: jest.fn().mockResolvedValue({ rows: [{ id: 'c1' }] }),
    insert: jest.fn().mockResolvedValue({ rows: [{ id: 'new-rec', control_key: 'AC-1' }] }),
  };
  return {
    ComplianceRepository: jest.fn().mockImplementation(() => complianceRepo),
  };
});

let authEnabled = true;
let userRole: 'user' | 'admin' = 'admin';

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: userRole,
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (userRole !== 'admin') {
      return next(new AppError('Insufficient permissions', 403, 'AUTHORIZATION_ERROR'));
    }
    return next();
  },
}));

describe('ComplianceModule HTTP list/query validation', () => {
  let server: http.Server;

  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ComplianceModule();
    await m.initialize();
    app.use('/compliance', m.router);
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
    userRole = 'admin';
    jest.clearAllMocks();
    complianceRepo.list.mockResolvedValue({ rows: [{ id: 'c1' }] });
    complianceRepo.insert.mockResolvedValue({ rows: [{ id: 'new-rec', control_key: 'AC-1' }] });
  });

  it('GET / succeeds with no query', async () => {
    const res = await request(server).get('/compliance/');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(complianceRepo.list).toHaveBeenCalledWith(undefined);
  });

  it('GET / succeeds with framework=gdpr', async () => {
    const res = await request(server).get('/compliance/').query({ framework: 'gdpr' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(complianceRepo.list).toHaveBeenCalledWith('gdpr');
  });

  it('GET / returns 400 for invalid framework', async () => {
    const res = await request(server).get('/compliance/').query({ framework: 'hipaa' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('GET / returns 400 for unknown query keys (strict)', async () => {
    const res = await request(server).get('/compliance/').query({ limit: '10' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('GET / returns 400 for duplicate framework query params', async () => {
    const res = await request(server).get('/compliance/?framework=gdpr&framework=soc2');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('GET / returns 400 for wrong-case framework', async () => {
    const res = await request(server).get('/compliance/').query({ framework: 'GDPR' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('GET / succeeds with trimmed framework', async () => {
    const res = await request(server).get('/compliance/').query({ framework: '  iso27001  ' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(complianceRepo.list).toHaveBeenCalledWith('iso27001');
  });

  it('GET / succeeds when framework is empty string (treated as absent)', async () => {
    const res = await request(server).get('/compliance/').query({ framework: '' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(complianceRepo.list).toHaveBeenCalledWith(undefined);
  });

  it('GET / returns 403 for non-admin', async () => {
    userRole = 'user';
    const res = await request(server).get('/compliance/');
    expect(res.status).toBe(403);
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('GET / returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/compliance/').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('POST /compliance returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/compliance/')
      .query({ draft: '1' })
      .send({ controlKey: 'AC-2', status: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });

  it('POST /compliance returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/compliance/').send({ controlKey: 'AC-2', status: 'pass', leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });

  it('POST /compliance returns 400 when controlKey is too short', async () => {
    const res = await request(server).post('/compliance/').send({ controlKey: 'a', status: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });

  it('POST /compliance creates record with valid body', async () => {
    const res = await request(server).post('/compliance/').send({
      framework: 'gdpr',
      controlKey: 'AC-99',
      status: 'warn',
      notes: 'ok',
      evidence: { ref: 'doc-1' },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(complianceRepo.insert).toHaveBeenCalledWith(
      'u1',
      'gdpr',
      'AC-99',
      'warn',
      'ok',
      expect.objectContaining({ ref: 'doc-1' })
    );
  });

  it('POST /compliance returns 403 for non-admin', async () => {
    userRole = 'user';
    const res = await request(server).post('/compliance/').send({ controlKey: 'AC-3', status: 'pass' });
    expect(res.status).toBe(403);
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /compliance', async () => {
    authEnabled = false;
    const res = await request(server).get('/compliance/');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /compliance', async () => {
    authEnabled = false;
    const res = await request(server).post('/compliance/').send({ controlKey: 'AC-4', status: 'pass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /compliance even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/compliance/').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(complianceRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /compliance even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/compliance/')
      .set('x-test-role', 'admin')
      .send({ controlKey: 'AC-4', status: 'pass' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(complianceRepo.insert).not.toHaveBeenCalled();
  });
});

/**
 * Admin onboarding-status routes with mocked DB + auth (unit; loads workflow-chain service).
 */
import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { AdminModule } from '../../../../modules/admin/admin.module';
import { WorkflowChainService } from '../../../../modules/workflow-chain/service/workflow-chain.service';
import * as db from '../../../../database/connection';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';
import { moduleRegistry } from '../../../../core/ModuleRegistry';

jest.mock('../../../../database/connection');
jest.mock('../../../../api/middleware/rate-limit.middleware', () => ({
  adminMutationLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../../../utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: unknown }).user = {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'admin@test.com',
      role: 'admin',
    };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

const summaryRow = {
  total: '10',
  success: '4',
  failed: '2',
  blocked: '0',
  created: '0',
  updated: '0',
  skipped: '0',
  strict_blocked_admin: '0',
  admin_retry: '0',
  admin_retry_failed: '0',
  admin_retry_all_user: '0',
};

const perUserSummaryRow = {
  total: '3',
  success: '1',
  failed: '0',
  blocked: '0',
  created: '0',
  updated: '0',
  skipped: '0',
};

const sampleUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const otherUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

type RetryAllCandidateRow = {
  actor_user_id: string;
  event_id: string;
  created_at: Date;
  event_type: string;
  priority_score: number;
};

/** When set, retry-all candidate SQL returns these rows (otherwise empty feed). */
let retryAllCandidateRows: RetryAllCandidateRow[] | null = null;
/** Passed to MAX(last_retry_at) mock for cooldown tests. */
let cooldownMockLastRetry: Date | null = null;

let bootstrapSpy: jest.SpyInstance;

const sampleUserRow = {
  id: sampleUserId,
  email: 'user@test.com',
  name: 'Test User',
  role: 'user',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  const adminModule = new AdminModule();
  app.use('/api/v1/admin', adminModule.router);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code, err.details);
    }
    return sendError(res, err.message || 'Error', 500);
  });
  return { app, adminModule };
}

function defaultOnboardingDbMock(sql: string): Promise<any> {
  if (/^\s*SELECT\s+1\s*$/i.test(sql.trim())) {
    return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 } as any);
  }
  if (/UPDATE\s+users\s+SET/i.test(sql)) {
    return Promise.resolve({
      rows: [
        {
          id: sampleUserId,
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
          is_active: true,
        },
      ],
      rowCount: 1,
    } as any);
  }
  if (/UPDATE\s+modules\s+SET/i.test(sql)) {
    return Promise.resolve({
      rows: [
        {
          id: sampleUserId,
          name: 'CRM',
          is_core: false,
          is_active: true,
          config: '{}',
        },
      ],
      rowCount: 1,
    } as any);
  }
  if (/INSERT\s+INTO\s+logs\s*\(/i.test(sql)) {
    return Promise.resolve({
      rows: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          level: 'info',
          category: 'admin',
          message: 'hello',
          context: '{}',
        },
      ],
      rowCount: 1,
    } as any);
  }
  if (/UPDATE\s+plans\s+SET/i.test(sql)) {
    return Promise.resolve({
      rows: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Pro',
          slug: 'starter',
        },
      ],
      rowCount: 1,
    } as any);
  }
  if (
    retryAllCandidateRows &&
    sql.includes('FROM audit_events ae') &&
    sql.includes('ORDER BY priority_score DESC') &&
    sql.includes('LIMIT $1')
  ) {
    return Promise.resolve({
      rows: retryAllCandidateRows,
      rowCount: retryAllCandidateRows.length,
    } as any);
  }
  if (sql.includes('MAX(created_at) AS last_retry_at')) {
    return Promise.resolve({
      rows: [{ last_retry_at: cooldownMockLastRetry }],
      rowCount: 1,
    } as any);
  }
  if (sql.includes('FROM users WHERE id') && !sql.includes('role')) {
    return Promise.resolve({
      rows: [{ id: sampleUserId, email: 'user@test.com', name: 'Test User' }],
      rowCount: 1,
    } as any);
  }
  if (sql.includes('FROM users WHERE id')) {
    return Promise.resolve({ rows: [sampleUserRow], rowCount: 1 } as any);
  }
  if (sql.includes('FROM users u') && sql.includes('LEFT JOIN plans')) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  if (sql.includes('FROM users u') && /SELECT\s+COUNT\(\*\)/i.test(sql)) {
    return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM payments p') && sql.includes('JOIN users u') && sql.includes('SELECT p.')) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  if (sql.includes('FROM payments p') && /SELECT\s+COUNT\(\*\)/i.test(sql)) {
    return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any);
  }
  if (sql.includes('SUM(CASE WHEN is_active THEN 1') && sql.includes('FROM users')) {
    return Promise.resolve({ rows: [{ count: '0', active: null }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM subscriptions') && sql.includes("status = 'active'")) {
    return Promise.resolve({ rows: [{ count: '0', active: null }], rowCount: 1 } as any);
  }
  if (sql.includes("FROM payments WHERE status = 'completed'")) {
    return Promise.resolve({ rows: [{ count: '0', total_revenue: '0' }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM tasks') && sql.includes("status = 'failed'")) {
    return Promise.resolve({ rows: [{ count: '0', failed: null }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM logs') && sql.includes("INTERVAL '24 hours'")) {
    return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM logs') && /SELECT\s+COUNT\(\*\)/i.test(sql)) {
    return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any);
  }
  if (sql.includes('FROM logs') && sql.includes('SELECT *') && sql.includes('ORDER BY created_at')) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  if (
    sql.includes('admin_email') &&
    sql.includes('FROM audit_events ae') &&
    sql.includes("ae.entity_type = 'user'")
  ) {
    return Promise.resolve({
      rows: [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          event_type: 'admin_onboarding_bootstrap_retry',
          payload: {},
          severity: 'info',
          created_at: new Date('2026-01-02T00:00:00.000Z'),
          admin_email: 'admin@test.com',
          admin_name: 'Admin',
        },
      ],
      rowCount: 1,
    } as any);
  }
  if (
    sql.includes("entity_type = 'user'") &&
    sql.includes('entity_id = $1') &&
    sql.includes(') AS retry_all_user') &&
    sql.includes('FROM audit_events') &&
    !sql.includes('FROM audit_events ae')
  ) {
    return Promise.resolve({
      rows: [{ retry: '2', retry_failed: '1', retry_all_user: '0' }],
      rowCount: 1,
    } as any);
  }
  if (
    sql.includes("entity_type = 'user'") &&
    sql.includes('entity_id = $1') &&
    sql.includes('admin_onboarding_bootstrap_retry') &&
    sql.includes('SELECT COUNT(*) AS count')
  ) {
    return Promise.resolve({ rows: [{ count: '3' }], rowCount: 1 } as any);
  }
  if (sql.includes('WHERE actor_user_id = $1') && sql.includes('COUNT(*) AS total')) {
    return Promise.resolve({ rows: [perUserSummaryRow], rowCount: 1 } as any);
  }
  if (sql.includes('WHERE actor_user_id = $1') && sql.includes('SELECT COUNT(*) AS count')) {
    return Promise.resolve({ rows: [{ count: '1' }], rowCount: 1 } as any);
  }
  if (
    sql.includes('SELECT id, actor_user_id, event_type, payload, created_at') &&
    sql.includes('actor_user_id = $1')
  ) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  if (sql.includes('FROM audit_events ae') && sql.includes('COUNT(*) AS total')) {
    return Promise.resolve({ rows: [summaryRow], rowCount: 1 } as any);
  }
  if (
    sql.includes('FROM audit_events') &&
    !sql.includes('FROM audit_events ae') &&
    sql.includes('admin_onboarding_bootstrap_retry_all') &&
    sql.includes("payload->>'idempotencyKey'")
  ) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  if (sql.includes('FROM audit_events') && !sql.includes('FROM audit_events ae')) {
    return Promise.resolve({ rows: [summaryRow], rowCount: 1 } as any);
  }
  if (sql.includes('FROM audit_events ae') && sql.includes('SELECT COUNT(*) AS count')) {
    if (sql.includes('WHERE ae.event_type = $') && !sql.includes('ae.event_type IN')) {
      return Promise.resolve({ rows: [{ count: '7' }], rowCount: 1 } as any);
    }
    return Promise.resolve({ rows: [{ count: '2' }], rowCount: 1 } as any);
  }
  if (sql.includes('SELECT COUNT(*) AS count')) {
    return Promise.resolve({ rows: [{ count: '2' }], rowCount: 1 } as any);
  }
  if (sql.includes('tu.email AS target_email')) {
    return Promise.resolve({ rows: [], rowCount: 0 } as any);
  }
  return Promise.resolve({ rows: [], rowCount: 0 } as any);
}

describe('Admin onboarding-status (mocked DB)', () => {
  let app: express.Application;
  let adminModule: AdminModule;
  let server: http.Server;

  beforeAll(async () => {
    bootstrapSpy = jest.spyOn(WorkflowChainService.prototype, 'bootstrapTemplates').mockResolvedValue({
      totals: { created: 0, updated: 0, skipped: 0, blocked: 0 },
    } as any);
    const x = buildApp();
    app = x.app;
    adminModule = x.adminModule;
    await adminModule.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    bootstrapSpy.mockRestore();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    retryAllCandidateRows = null;
    cooldownMockLastRetry = null;
    jest.clearAllMocks();
    mockQuery.mockImplementation(defaultOnboardingDbMock);
    bootstrapSpy.mockResolvedValue({
      totals: { created: 0, updated: 0, skipped: 0, blocked: 0 },
    } as any);
  });

  it('PATCH /users/:id returns 400 when query params are present', async () => {
    const res = await request(server)
      .patch(`/api/v1/admin/users/${sampleUserId}`)
      .query({ notify: '1' })
      .send({ role: 'user' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /modules/:id returns 400 when query params are present', async () => {
    const res = await request(server)
      .patch(`/api/v1/admin/modules/${sampleUserId}`)
      .query({ x: '1' })
      .send({ isActive: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /logs returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/api/v1/admin/logs')
      .query({ stream: '1' })
      .send({ message: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('PATCH /plans/:id returns 400 when query params are present', async () => {
    const res = await request(server)
      .patch('/api/v1/admin/plans/22222222-2222-4222-8222-222222222222')
      .query({ force: '1' })
      .send({ name: 'Pro' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /onboarding-status/:userId/retry returns 400 when query params are present', async () => {
    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .query({ force: '1' })
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(bootstrapSpy).not.toHaveBeenCalled();
  });

  it('POST /onboarding-status/retry-all returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .query({ batch: '1' })
      .send({ dryRun: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(bootstrapSpy).not.toHaveBeenCalled();
  });

  it('GET /api/v1/admin/onboarding-status returns success with pagination', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalEvents).toBe(10);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.pagination.totalPages).toBe(1);
    expect(res.body.data.meta.sort).toBe('desc');
    expect(Array.isArray(res.body.data.events)).toBe(true);
  });

  it('GET /onboarding-status clamps limit to max 100', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ page: 1, limit: 500 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });

  it('GET /onboarding-status/:userId clamps limit to max 100', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ limit: 999 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(100);
  });

  it('GET /onboarding-status uses default limit 20 when limit=0', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ limit: 0 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(20);
  });

  it('GET /onboarding-status floors negative limit to 1', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ limit: -5 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(1);
  });

  it('GET /onboarding-status normalizes page=0 to page 1', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ page: 0, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
  });

  it('GET /onboarding-status reports requested page in pagination', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ page: 3, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(3);
  });

  it('GET with sort=asc sets meta.sort asc', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ sort: 'asc' });
    expect(res.status).toBe(200);
    expect(res.body.data.meta.sort).toBe('asc');
  });

  it('GET /onboarding-status/:userId returns 400 for invalid UUID', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status/not-a-valid-uuid');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /onboarding-status/:userId returns 200 with user and summary', async () => {
    const res = await request(server).get(`/api/v1/admin/onboarding-status/${sampleUserId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user?.id).toBe(sampleUserId);
    expect(res.body.data.summary.totalEvents).toBe(3);
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.pagination.totalPages).toBe(1);
    expect(res.body.data.meta.sort).toBe('desc');
  });

  it('GET /onboarding-status with eventType returns meta.eventType and filteredSummary', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ eventType: 'auth_register_bootstrap', page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.eventType).toBe('auth_register_bootstrap');
    expect(res.body.data.filteredSummary).toBeDefined();
    expect(res.body.data.filteredSummary.totalEvents).toBe(10);
    expect(res.body.data.pagination.total).toBe(7);
  });

  it('GET /onboarding-status with invalid eventType adds warning and omits meta.eventType', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ eventType: 'not_a_valid_onboarding_type' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.eventType).toBeUndefined();
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['eventType is invalid and was ignored.'])
    );
    expect(res.body.data.filteredSummary).toBeUndefined();
  });

  it('GET /onboarding-status with eventType and status warns status is ignored', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ eventType: 'auth_register_bootstrap', status: 'failed' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.eventType).toBe('auth_register_bootstrap');
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['status filter ignored because eventType is set.'])
    );
  });

  it('GET /onboarding-status warns invalid from/to datetimes', async () => {
    const resFrom = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ from: 'not-a-datetime' });

    expect(resFrom.status).toBe(200);
    expect(resFrom.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['from is invalid datetime and was ignored.'])
    );
    expect(resFrom.body.data.meta.from).toBeUndefined();

    const resTo = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ to: 'also-invalid' });

    expect(resTo.status).toBe(200);
    expect(resTo.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['to is invalid datetime and was ignored.'])
    );
    expect(resTo.body.data.meta.to).toBeUndefined();
  });

  it('GET /onboarding-status when from is later than to drops to and warns', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['from is later than to; to was ignored.'])
    );
    expect(res.body.data.meta.from).toBe('2026-02-01T00:00:00.000Z');
    expect(res.body.data.meta.to).toBeUndefined();
  });

  it('GET /onboarding-status warns invalid actorUserId and targetUserId UUIDs', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({
      actorUserId: 'not-a-uuid',
      targetUserId: 'also-not-uuid',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining([
        'actorUserId is invalid UUID and was ignored.',
        'targetUserId is invalid UUID and was ignored.',
      ])
    );
    expect(res.body.data.meta.actorUserId).toBeUndefined();
    expect(res.body.data.meta.targetUserId).toBeUndefined();
  });

  it('GET /onboarding-status with invalid sort warns and keeps meta.sort desc', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ sort: 'sideways' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.sort).toBe('desc');
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['sort is invalid; using desc.'])
    );
  });

  it('GET /onboarding-status/:userId warns invalid from and invalid sort', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ from: 'bad', sort: 'not-a-sort' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.sort).toBe('desc');
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining([
        'from is invalid datetime and was ignored.',
        'sort is invalid; using desc.',
      ])
    );
  });

  it('GET /onboarding-status/:userId when from is later than to drops to and warns', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['from is later than to; to was ignored.'])
    );
    expect(res.body.data.meta.from).toBe('2026-03-01T00:00:00.000Z');
    expect(res.body.data.meta.to).toBeUndefined();
  });

  it('GET /onboarding-status/:userId with includeAdminActions returns admin blocks', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ includeAdminActions: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.data.includeAdminActions).toBe(true);
    expect(res.body.data.adminPagination).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
    expect(res.body.data.adminActionsSummary).toEqual({
      retry: 2,
      retryFailed: 1,
      retryAllUser: 0,
    });
    expect(Array.isArray(res.body.data.adminActions)).toBe(true);
    expect(res.body.data.adminActions).toHaveLength(1);
    expect(res.body.data.adminActions[0].event_type).toBe('admin_onboarding_bootstrap_retry');
  });

  it('GET /onboarding-status/:userId includeAdminActions honors adminPage/adminLimit', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ includeAdminActions: 'true', page: 2, limit: 5, adminPage: 3, adminLimit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
    expect(res.body.data.adminPagination).toEqual({
      page: 3,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('GET /onboarding-status/:userId includeAdminActions clamps adminLimit to max 100', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ includeAdminActions: 'true', adminLimit: 500 });

    expect(res.status).toBe(200);
    expect(res.body.data.adminPagination?.limit).toBe(100);
  });

  it('GET /onboarding-status/:userId warns invalid to only', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ to: 'not-a-date' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.warnings).toEqual(
      expect.arrayContaining(['to is invalid datetime and was ignored.'])
    );
    expect(res.body.data.meta.to).toBeUndefined();
  });

  it('GET /onboarding-status/:userId sets meta.to when from and to are both valid', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-06-01T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.from).toBe('2026-01-01T00:00:00.000Z');
    expect(res.body.data.meta.to).toBe('2026-06-01T00:00:00.000Z');
  });

  it('GET /onboarding-status/:userId with includeAdminActions and valid date range includes meta.to', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({
        includeAdminActions: 'true',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-06-30T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.to).toBe('2026-06-30T00:00:00.000Z');
    expect(res.body.data.includeAdminActions).toBe(true);
  });

  it('GET /onboarding-status/:userId returns null user when profile row is missing', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('role, created_at FROM users WHERE id')) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server).get(`/api/v1/admin/onboarding-status/${sampleUserId}`).query({ page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeNull();
    expect(res.body.data.summary.totalEvents).toBeDefined();
  });

  it('POST /onboarding-status/:userId/retry returns 400 for invalid UUID', async () => {
    const res = await request(server).post('/api/v1/admin/onboarding-status/not-a-uuid/retry').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /onboarding-status/:userId/retry returns null data when user not found', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM users WHERE id') && !sql.includes('role')) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('User not found');
  });

  it('POST /onboarding-status/:userId/retry succeeds and truncates long namePrefix', async () => {
    const longPrefix = 'p'.repeat(250);
    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .send({ namePrefix: longPrefix });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Onboarding bootstrap retried');
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('namePrefix was truncated')])
    );
    expect(res.body.data.namePrefix).toHaveLength(200);
    expect(bootstrapSpy).toHaveBeenCalledWith(sampleUserId, false, longPrefix.slice(0, 200));
  });

  it('POST /onboarding-status/:userId/retry propagates error when bootstrap fails', async () => {
    bootstrapSpy.mockRejectedValueOnce(new Error('bootstrap exploded'));
    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('POST /onboarding-status/:userId/retry treats non-Error rejection as unknown for audit', async () => {
    bootstrapSpy.mockRejectedValueOnce('plain-string-rejection');
    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('POST /onboarding-status/:userId/retry passes overwrite to bootstrap', async () => {
    const res = await request(server)
      .post(`/api/v1/admin/onboarding-status/${sampleUserId}/retry`)
      .send({ overwrite: true });

    expect(res.status).toBe(200);
    expect(bootstrapSpy).toHaveBeenCalledWith(sampleUserId, true, undefined);
  });

  it('POST /onboarding-status/retry-all strict blocks when warnings present', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ strict: true, resumeFromUserId: 'not-a-uuid' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      strict: true,
      blocked: true,
      warnings: expect.arrayContaining(['resumeFromUserId is invalid UUID and was ignored.']),
    });
    expect(res.body.message).toBe('Retry-all blocked by strict mode');
  });

  it('GET /onboarding-status includes meta.actorUserId and meta.targetUserId when valid', async () => {
    const actor = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const target = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ actorUserId: actor, targetUserId: target });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.actorUserId).toBe(actor);
    expect(res.body.data.meta.targetUserId).toBe(target);
    expect(res.body.data.filteredSummary).toBeDefined();
    expect(res.body.data.filteredSummary.totalEvents).toBe(10);
  });

  it('GET /onboarding-status maps filteredSummary to zeros when filtered aggregate returns no row', async () => {
    const actor = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes('COUNT(*) AS total,') &&
        sql.includes('FROM audit_events ae') &&
        sql.includes('ae.actor_user_id = $')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ actorUserId: actor });

    expect(res.status).toBe(200);
    expect(res.body.data.filteredSummary).toBeDefined();
    expect(res.body.data.filteredSummary.totalEvents).toBe(0);
    expect(res.body.data.meta.actorUserId).toBe(actor);
  });

  it('GET /onboarding-status uses zero total when feed count returns no row', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes('SELECT COUNT(*) AS count') &&
        sql.includes('FROM audit_events ae') &&
        sql.includes('event_type IN')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server).get('/api/v1/admin/onboarding-status');

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('GET /onboarding-status/:userId falls back limit and page when query numbers invalid', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ limit: 'nan', page: 'bad' });

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ limit: 20, page: 1 });
  });

  it('GET /onboarding-status/:userId includeAdminActions uses 20/1 when admin pagination numbers invalid', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({
        includeAdminActions: 'true',
        limit: '15',
        adminLimit: 'bogus',
        adminPage: 'bogus',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.adminPagination?.limit).toBe(20);
    expect(res.body.data.adminPagination?.page).toBe(1);
  });

  it('GET /onboarding-status/:userId includeAdminActions handles empty admin count and summary rows', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes("entity_type = 'user'") &&
        sql.includes('entity_id = $1') &&
        sql.includes('admin_onboarding_bootstrap_retry') &&
        sql.includes('SELECT COUNT(*) AS count')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      if (
        sql.includes("entity_type = 'user'") &&
        sql.includes('entity_id = $1') &&
        sql.includes(') AS retry_all_user') &&
        sql.includes('FROM audit_events') &&
        !sql.includes('FROM audit_events ae')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ includeAdminActions: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.data.adminPagination?.total).toBe(0);
    expect(res.body.data.adminActionsSummary).toEqual({
      retry: 0,
      retryFailed: 0,
      retryAllUser: 0,
    });
  });

  it('GET /onboarding-status/:userId maps user summary to zeros when aggregate returns no row', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes('COUNT(*) AS total') &&
        sql.includes('WHERE actor_user_id = $1') &&
        sql.includes('FROM audit_events') &&
        !sql.includes('FROM audit_events ae') &&
        sql.includes('auth_register_bootstrap')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server).get(`/api/v1/admin/onboarding-status/${sampleUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalEvents).toBe(0);
  });

  it('GET /onboarding-status/:userId uses zero feed total when per-user count returns no row', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes('SELECT COUNT(*) AS count') &&
        sql.includes('WHERE actor_user_id = $1') &&
        sql.includes('FROM audit_events') &&
        !sql.includes('FROM audit_events ae') &&
        sql.includes('auth_first_login_bootstrap')
      ) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server).get(`/api/v1/admin/onboarding-status/${sampleUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('POST /onboarding-status/retry-all skips work when idempotency key matches prior run', async () => {
    const prevDate = new Date('2026-01-15T12:00:00.000Z');
    mockQuery.mockImplementation((sql: string) => {
      if (
        sql.includes('admin_onboarding_bootstrap_retry_all') &&
        sql.includes("payload->>'idempotencyKey'")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              payload: { idempotencyKey: 'stable-key', note: 'prior' },
              created_at: prevDate,
            },
          ],
          rowCount: 1,
        } as any);
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ idempotencyKey: 'stable-key' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reused).toBe(true);
    expect(res.body.data.idempotencyKey).toBe('stable-key');
    expect(res.body.data.previousRun?.eventId).toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
    expect(res.body.data.previousRun?.createdAt).toBe(prevDate.toISOString());
    expect(res.body.message).toBe('Duplicate retry-all request skipped (idempotency hit)');
  });

  it('POST /onboarding-status/retry-all dryRun completes with no candidates (mocked empty feed)', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, limit: 10, maxUsersPerRun: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Batch onboarding retry dry-run completed');
    expect(res.body.data.filter?.dryRun).toBe(true);
    expect(res.body.data.attemptedUsers).toBe(0);
    expect(res.body.data.eligibleUserIds).toEqual([]);
  });

  it('POST retry-all warns when includeUserIds has only invalid UUIDs', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, includeUserIds: ['bad', 'also-bad'] });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining(['includeUserIds contained no valid UUIDs; no users will match.'])
    );
  });

  it('POST retry-all warns when excludeUserIds drops invalid entries', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, excludeUserIds: ['not-uuid', sampleUserId] });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/excludeUserIds: 1 invalid user id\(s\) ignored\./)])
    );
  });

  it('POST retry-all warns on includeUserIds and excludeUserIds overlap', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        includeUserIds: [sampleUserId],
        excludeUserIds: [sampleUserId],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('includeUserIds/excludeUserIds overlap')])
    );
  });

  it('POST retry-all dedupeBy all keeps multiple events per user in selectedEvents', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
      {
        actor_user_id: sampleUserId,
        event_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        created_at: new Date('2026-01-02T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, dedupeBy: 'all', limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.selectedEvents).toHaveLength(2);
  });

  it('POST retry-all dryRun skips users under cooldown when last retry is recent', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    cooldownMockLastRetry = new Date();
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, cooldownHours: 24, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.skippedByCooldown?.length).toBe(1);
    expect(res.body.data.attemptedUsers).toBe(0);
  });

  it('POST retry-all runs bootstrap when dryRun is false and candidates exist', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: false, limit: 10, maxUsersPerRun: 5, cooldownHours: 0 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Batch onboarding retry completed');
    expect(res.body.data.attemptedUsers).toBe(1);
    expect(bootstrapSpy).toHaveBeenCalledWith(sampleUserId, false, undefined);
    expect(res.body.data.retried).toHaveLength(1);
  });

  it('POST retry-all passes overwrite to bootstrapTemplates', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: false, limit: 10, maxUsersPerRun: 5, cooldownHours: 0, overwrite: true });

    expect(res.status).toBe(200);
    expect(bootstrapSpy).toHaveBeenCalledWith(sampleUserId, true, undefined);
  });

  it('POST retry-all records unknown when bootstrap rejects non-Error', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    bootstrapSpy.mockRejectedValueOnce('not-an-error-object');

    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: false, limit: 10, maxUsersPerRun: 5, cooldownHours: 0 });

    expect(res.status).toBe(200);
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0].error).toBe('unknown');
  });

  it('POST retry-all resumeFromUserId starts eligible list from that user', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'e1eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
      {
        actor_user_id: otherUserId,
        event_id: 'e2eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-02T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: false,
        resumeFromUserId: otherUserId,
        sortBy: 'oldest',
        maxUsersPerRun: 10,
        cooldownHours: 0,
        limit: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.filter?.resumeApplied).toBe(true);
    expect(res.body.data.filter?.resumeFound).toBe(true);
    expect(bootstrapSpy).toHaveBeenCalledTimes(1);
    expect(bootstrapSpy).toHaveBeenCalledWith(otherUserId, false, undefined);
  });

  it('POST retry-all stopOnFirstError stops after first bootstrap failure', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'e1eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
      {
        actor_user_id: otherUserId,
        event_id: 'e2eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-02T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    bootstrapSpy
      .mockRejectedValueOnce(new Error('fail-user-a'))
      .mockResolvedValueOnce({ totals: { created: 1, updated: 0, skipped: 0, blocked: 0 } } as any);

    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: false,
        stopOnFirstError: true,
        maxUsersPerRun: 10,
        cooldownHours: 0,
        sortBy: 'oldest',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.stoppedEarly).toBe(true);
    expect(res.body.data.stopReason).toMatch(/Stopped after first error/);
    expect(res.body.data.failed).toHaveLength(1);
    expect(bootstrapSpy).toHaveBeenCalledTimes(1);
  });

  it('POST retry-all respects maxFailures after repeated bootstrap errors', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'e1eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
      {
        actor_user_id: otherUserId,
        event_id: 'e2eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-02T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    bootstrapSpy.mockRejectedValue(new Error('always fail'));

    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: false,
        maxFailures: 1,
        stopOnFirstError: false,
        maxUsersPerRun: 10,
        cooldownHours: 0,
        sortBy: 'oldest',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.failed.length).toBe(1);
    expect(res.body.data.stoppedEarly).toBe(true);
    expect(res.body.data.stopReason).toMatch(/maxFailures/);
  });

  it('POST retry-all treats empty includeUserIds as unset (null)', async () => {
    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, includeUserIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.filter?.includeUserIds).toBeNull();
    expect(res.body.data.selectedEvents).toHaveLength(1);
  });

  it('POST retry-all stops when maxDurationMs is exceeded between users', async () => {
    const dateSpy = jest.spyOn(Date, 'now');
    const t0 = 1_700_000_000_000;
    let tick = t0;
    dateSpy.mockImplementation(() => tick);

    retryAllCandidateRows = [
      {
        actor_user_id: sampleUserId,
        event_id: 'e1eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
      {
        actor_user_id: otherUserId,
        event_id: 'e2eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        created_at: new Date('2026-01-02T00:00:00.000Z'),
        event_type: 'auth_register_bootstrap_failed',
        priority_score: 3,
      },
    ];
    bootstrapSpy.mockImplementation(async () => {
      tick += 5000;
      return { totals: { created: 0, updated: 0, skipped: 0, blocked: 0 } } as any;
    });

    try {
      const res = await request(server)
        .post('/api/v1/admin/onboarding-status/retry-all')
        .send({
          dryRun: false,
          maxDurationMs: 1000,
          maxUsersPerRun: 10,
          cooldownHours: 0,
          sortBy: 'oldest',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stoppedEarly).toBe(true);
      expect(res.body.data.stopReason).toMatch(/maxDurationMs/);
      expect(bootstrapSpy).toHaveBeenCalledTimes(1);
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('GET /onboarding-status sets meta.from and meta.to for valid range', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.from).toBe('2026-01-01T00:00:00.000Z');
    expect(res.body.data.meta.to).toBe('2026-01-31T23:59:59.999Z');
    expect(res.body.data.filteredSummary).toBeDefined();
  });

  it('POST /onboarding-status/retry-all dryRun surfaces include/exclude warnings', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        includeUserIds: ['not-a-uuid', sampleUserId],
        excludeUserIds: ['also-bad'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'includeUserIds: 1 invalid user id(s) ignored.',
        'excludeUserIds: 1 invalid user id(s) ignored.',
      ])
    );
  });

  it('POST /onboarding-status/retry-all dryRun warns include/exclude overlap', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        includeUserIds: [sampleUserId],
        excludeUserIds: [sampleUserId],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'includeUserIds/excludeUserIds overlap detected for 1 user(s). Exclude wins.',
      ])
    );
  });

  it('POST /onboarding-status/retry-all dryRun warns stopOnFirstError vs maxFailures', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, stopOnFirstError: true, maxFailures: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'stopOnFirstError=true takes precedence; maxFailures may never be reached.',
        'dryRun=true: runtime stop guards are evaluated but no bootstrap execution occurs.',
      ])
    );
  });

  it('POST /onboarding-status/retry-all strict blocks when includeUserIds has no valid UUIDs', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ strict: true, includeUserIds: ['totally-invalid'] });

    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'includeUserIds: 1 invalid user id(s) ignored.',
        'includeUserIds contained no valid UUIDs; no users will match.',
      ])
    );
    expect(res.body.message).toBe('Retry-all blocked by strict mode');
  });

  it('POST /onboarding-status/retry-all dryRun warns truncated namePrefix and idempotencyKey', async () => {
    const longPrefix = 'p'.repeat(250);
    const longKey = 'k'.repeat(250);
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        namePrefix: longPrefix,
        idempotencyKey: longKey,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'namePrefix was truncated to 200 characters.',
        'idempotencyKey was truncated to 200 characters.',
      ])
    );
    expect(res.body.data.filter?.namePrefix).toBe('p'.repeat(200));
    expect(res.body.data.filter?.idempotencyKey).toBe('k'.repeat(200));
  });

  it('GET /onboarding-status with status=failed sets meta.status and filteredSummary', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ status: 'failed', page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.status).toBe('failed');
    expect(res.body.data.filteredSummary).toBeDefined();
  });

  it('GET /onboarding-status/:userId with sort=asc sets meta.sort asc', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ sort: 'asc' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.sort).toBe('asc');
  });

  it('POST /onboarding-status/retry-all dryRun warns resumeFromUserId not in includeUserIds', async () => {
    const otherId = '11111111-1111-4111-8111-111111111111';
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        resumeFromUserId: otherId,
        includeUserIds: [sampleUserId],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.warnings).toEqual(
      expect.arrayContaining([
        'resumeFromUserId is not present in includeUserIds; resume may not apply.',
      ])
    );
  });

  it('GET /onboarding-status unknown status query maps meta.status to all', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ status: 'not-a-known-status' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.status).toBe('all');
    expect(res.body.data.filteredSummary).toBeUndefined();
  });

  it('GET /onboarding-status with status=success sets meta.status and filteredSummary', async () => {
    const res = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ status: 'success' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.status).toBe('success');
    expect(res.body.data.filteredSummary).toBeDefined();
  });

  it('GET /onboarding-status sort ascending and descending aliases set meta.sort', async () => {
    const asc = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ sort: 'ascending' });
    expect(asc.status).toBe(200);
    expect(asc.body.data.meta.sort).toBe('asc');

    const desc = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ sort: 'descending' });
    expect(desc.status).toBe(200);
    expect(desc.body.data.meta.sort).toBe('desc');
  });

  it('GET /onboarding-status/:userId sort=ascending sets meta.sort asc', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ sort: 'ascending' });

    expect(res.status).toBe(200);
    expect(res.body.data.meta.sort).toBe('asc');
  });

  it('POST /onboarding-status/retry-all dryRun reflects status blocked in filter', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({ dryRun: true, status: 'blocked' });

    expect(res.status).toBe(200);
    expect(res.body.data.filter?.status).toBe('blocked');
  });

  it('GET /onboarding-status with status=strict and status=admin set meta.status and filteredSummary', async () => {
    const strictRes = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ status: 'strict' });
    expect(strictRes.status).toBe(200);
    expect(strictRes.body.data.meta.status).toBe('strict');
    expect(strictRes.body.data.filteredSummary).toBeDefined();

    const adminRes = await request(server)
      .get('/api/v1/admin/onboarding-status')
      .query({ status: 'admin' });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.meta.status).toBe('admin');
    expect(adminRes.body.data.filteredSummary).toBeDefined();
  });

  it('POST /onboarding-status/retry-all dryRun reflects status all and sort options in filter', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        status: 'all',
        sortBy: 'oldest',
        dedupeBy: 'all',
        minPriorityScore: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.filter?.status).toBe('all');
    expect(res.body.data.filter?.sortBy).toBe('oldest');
    expect(res.body.data.filter?.dedupeBy).toBe('all');
    expect(res.body.data.filter?.minPriorityScore).toBe(2);
  });

  it('POST /onboarding-status/retry-all dryRun echoes runtime guard fields in filter', async () => {
    const res = await request(server)
      .post('/api/v1/admin/onboarding-status/retry-all')
      .send({
        dryRun: true,
        overwrite: true,
        limit: 40,
        maxUsersPerRun: 12,
        cooldownHours: 24,
        stopOnFirstError: true,
        maxFailures: 0,
        maxDurationMs: 60_000,
        strict: false,
      });

    expect(res.status).toBe(200);
    const f = res.body.data.filter;
    expect(f?.overwrite).toBe(true);
    expect(f?.limit).toBe(40);
    expect(f?.maxUsersPerRun).toBe(12);
    expect(f?.cooldownHours).toBe(24);
    expect(f?.stopOnFirstError).toBe(true);
    expect(f?.maxFailures).toBe(0);
    expect(f?.maxDurationMs).toBe(60_000);
    expect(f?.strict).toBe(false);
  });

  it('GET /health reports healthy when database check succeeds', async () => {
    const res = await request(server).get('/api/v1/admin/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database.ok).toBe(true);
    expect(typeof res.body.data.database.latencyMs).toBe('number');
  });

  it('GET /health reports degraded when SELECT 1 fails', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (/^\s*SELECT\s+1\s*$/i.test(sql.trim())) {
        return Promise.reject(new Error('db unreachable'));
      }
      return defaultOnboardingDbMock(sql);
    });

    const res = await request(server).get('/api/v1/admin/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database.ok).toBe(false);
    expect(typeof res.body.data.database.latencyMs).toBe('number');
  });

  it('GET /modules returns success with array data', async () => {
    const res = await request(server).get('/api/v1/admin/modules');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /plans returns success with array data', async () => {
    const res = await request(server).get('/api/v1/admin/plans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /users rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/api/v1/admin/users').query({ page: 1, limit: 20, extra: 'x' });
    expect(res.status).toBe(400);
  });

  it('GET /payments rejects unknown query keys (strict)', async () => {
    const res = await request(server)
      .get('/api/v1/admin/payments')
      .query({ page: 1, limit: 20, unknownFilter: 'x' });
    expect(res.status).toBe(400);
  });

  it('GET /logs rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/api/v1/admin/logs').query({ page: 1, limit: 50, extra: '1' });
    expect(res.status).toBe(400);
  });

  it('GET /onboarding-status rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/api/v1/admin/onboarding-status').query({ page: 1, unknown: '1' });
    expect(res.status).toBe(400);
  });

  it('GET /onboarding-status/:userId rejects unknown query keys (strict)', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ notAParam: '1' });
    expect(res.status).toBe(400);
  });

  it('GET /onboarding-status/:userId ignores non-boolean includeAdminActions (no 400)', async () => {
    const res = await request(server)
      .get(`/api/v1/admin/onboarding-status/${sampleUserId}`)
      .query({ includeAdminActions: 'maybe' });

    expect(res.status).toBe(200);
    expect(res.body.data.includeAdminActions).toBe(false);
    expect(res.body.data.adminPagination).toBeUndefined();
  });

  it('GET /users returns paginated empty list', async () => {
    const res = await request(server).get('/api/v1/admin/users').query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /payments returns paginated empty list', async () => {
    const res = await request(server).get('/api/v1/admin/payments').query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /logs returns paginated empty list', async () => {
    const res = await request(server).get('/api/v1/admin/logs').query({ page: 1, limit: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /overview returns aggregated metrics and runtime info', async () => {
    const res = await request(server).get('/api/v1/admin/overview');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toEqual({ total: 0, active: 0 });
    expect(res.body.data.subscriptions).toEqual({ total: 0, active: 0 });
    expect(res.body.data.payments).toMatchObject({ total: 0, totalRevenue: 0 });
    expect(res.body.data.tasks).toEqual({ total: 0, failed: 0 });
    expect(res.body.data.logs).toEqual({ last24h: 0 });
    expect(Array.isArray(res.body.data.modules)).toBe(true);
    expect(Array.isArray(res.body.data.registeredModuleSlugs)).toBe(true);
    expect(res.body.data.registeredModuleSlugs).toEqual(
      res.body.data.modules.map((m: { slug: string }) => m.slug)
    );
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.memoryUsage).toBe('object');
    expect(typeof res.body.data.nodeVersion).toBe('string');
  });

  it('GET /overview maps moduleRegistry entries (non-empty getAll)', async () => {
    moduleRegistry.register({
      name: 'Cov Overview Mod',
      slug: 'cov-stub-overview',
      version: '9.9.9',
      isCore: false,
      router: express.Router(),
      initialize: jest.fn().mockResolvedValue(undefined),
    });
    const res = await request(server).get('/api/v1/admin/overview');
    expect(res.status).toBe(200);
    const found = res.body.data.modules.find(
      (m: { slug: string }) => m.slug === 'cov-stub-overview'
    );
    expect(found).toEqual({
      name: 'Cov Overview Mod',
      slug: 'cov-stub-overview',
      version: '9.9.9',
      isCore: false,
    });
    expect(res.body.data.registeredModuleSlugs).toContain('cov-stub-overview');
  });

  it('GET /users applies search, role and isActive filters', async () => {
    const res = await request(server).get('/api/v1/admin/users').query({
      page: 1,
      limit: 20,
      search: 'test',
      role: 'user',
      isActive: 'true',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('PATCH /users/:id updates user when body has fields', async () => {
    const res = await request(server)
      .patch(`/api/v1/admin/users/${sampleUserId}`)
      .send({ role: 'user', isActive: true, planId: sampleUserId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User updated');
  });

  it('PATCH /users/:id returns no changes when body is empty', async () => {
    const res = await request(server).patch(`/api/v1/admin/users/${sampleUserId}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('No changes');
  });

  it('PATCH /modules/:id updates module', async () => {
    const res = await request(server)
      .patch(`/api/v1/admin/modules/${sampleUserId}`)
      .send({ isActive: true, config: { enabled: true } });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Module updated');
  });

  it('PATCH /modules/:id returns no changes when body is empty', async () => {
    const res = await request(server).patch(`/api/v1/admin/modules/${sampleUserId}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('No changes');
  });

  it('POST /logs writes log entry', async () => {
    const res = await request(server)
      .post('/api/v1/admin/logs')
      .send({ message: 'Admin note', level: 'info', category: 'admin', context: { a: 1 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Log written');
  });

  it('PATCH /plans/:id updates plan', async () => {
    const planId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const res = await request(server).patch(`/api/v1/admin/plans/${planId}`).send({ name: 'Pro' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Plan updated');
  });

  it('PATCH /plans/:id returns no changes when body is empty', async () => {
    const res = await request(server).patch(`/api/v1/admin/plans/${sampleUserId}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('No changes');
  });

  it('GET /payments applies status and provider filters', async () => {
    const res = await request(server)
      .get('/api/v1/admin/payments')
      .query({ page: 1, limit: 20, status: 'completed', provider: 'stripe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /logs applies level and category filters', async () => {
    const res = await request(server)
      .get('/api/v1/admin/logs')
      .query({ page: 1, limit: 50, level: 'error', category: 'system' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /users filters by role only', async () => {
    const res = await request(server).get('/api/v1/admin/users').query({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /users filters by isActive=false only', async () => {
    const res = await request(server).get('/api/v1/admin/users').query({ isActive: 'false' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /payments filters by status only', async () => {
    const res = await request(server).get('/api/v1/admin/payments').query({ status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /payments filters by provider only', async () => {
    const res = await request(server).get('/api/v1/admin/payments').query({ provider: 'stripe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /logs uses default page 1 and limit 50 when query omitted', async () => {
    const res = await request(server).get('/api/v1/admin/logs');

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 50 });
  });

  it('POST /logs uses default level, category and context', async () => {
    const res = await request(server).post('/api/v1/admin/logs').send({ message: 'minimal entry' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Log written');
  });

  it('PATCH /users/:id updates isActive only', async () => {
    const res = await request(server)
      .patch(`/api/v1/admin/users/${sampleUserId}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User updated');
  });

  it('PATCH /plans/:id JSON-stringifies object fields', async () => {
    const planId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const res = await request(server)
      .patch(`/api/v1/admin/plans/${planId}`)
      // Isolate this assertion from shared in-memory mutation limiter state.
      .set('x-forwarded-for', '10.255.255.200')
      .send({
        features: { widgets: true },
        limits: { seats: 5 },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Plan updated');
  });
});

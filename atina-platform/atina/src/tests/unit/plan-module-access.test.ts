import * as db from '../../database/connection';
import {
  assertPlanIncludesModule,
  grantUserModules,
  planIncludesModule,
} from '../../utils/plan-module-access';
import { PaymentError } from '../../utils/errors';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('plan-module-access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('planIncludesModule accepts all', () => {
    expect(planIncludesModule({ modules: 'all' }, 'ai-memory')).toBe(true);
  });

  it('planIncludesModule accepts listed slug', () => {
    expect(planIncludesModule({ modules: ['crm', 'ai-memory'] }, 'ai-memory')).toBe(true);
  });

  it('assertPlanIncludesModule throws when module missing and no user_modules', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ limits: { modules: ['crm'] }, role: 'user' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ ok: false }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).rejects.toBeInstanceOf(PaymentError);
  });

  it('assertPlanIncludesModule passes via user_modules entitlement', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ limits: { modules: ['crm'] }, role: 'user' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ ok: true }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).resolves.toBeUndefined();
  });

  it('assertPlanIncludesModule passes for enterprise all', async () => {
    mockQuery.mockResolvedValue({ rows: [{ limits: { modules: 'all' }, role: 'user' }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).resolves.toBeUndefined();
  });

  it('assertPlanIncludesModule bypasses plan check for admin role', async () => {
    mockQuery.mockResolvedValue({ rows: [{ limits: { modules: ['crm'] }, role: 'admin' }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).resolves.toBeUndefined();
  });

  it('grantUserModules upserts known module slugs', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'mod-notif' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const granted = await grantUserModules('u1', ['notifications', 'missing-slug']);
    expect(granted).toEqual(['notifications']);
    expect(mockQuery).toHaveBeenCalled();
  });
});

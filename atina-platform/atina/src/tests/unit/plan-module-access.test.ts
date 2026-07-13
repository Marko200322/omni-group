import * as db from '../../database/connection';
import { assertPlanIncludesModule, planIncludesModule } from '../../utils/plan-module-access';
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

  it('assertPlanIncludesModule throws when module missing', async () => {
    mockQuery.mockResolvedValue({ rows: [{ limits: { modules: ['crm'] }, role: 'user' }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).rejects.toBeInstanceOf(PaymentError);
  });

  it('assertPlanIncludesModule passes for enterprise all', async () => {
    mockQuery.mockResolvedValue({ rows: [{ limits: { modules: 'all' }, role: 'user' }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).resolves.toBeUndefined();
  });

  it('assertPlanIncludesModule bypasses plan check for admin role', async () => {
    mockQuery.mockResolvedValue({ rows: [{ limits: { modules: ['crm'] }, role: 'admin' }], rowCount: 1 } as never);
    await expect(assertPlanIncludesModule('u1', 'ai-memory')).resolves.toBeUndefined();
  });
});

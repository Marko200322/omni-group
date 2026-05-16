import { ResourceManagementService } from '../../modules/resource-management/service/resource-management.service';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('ResourceManagementService', () => {
  let service: ResourceManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResourceManagementService();
  });

  describe('getOverview', () => {
    it('returns ROI when budget > 0', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '100' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ total: '50' }], rowCount: 1 } as never);

      await expect(service.getOverview()).resolves.toEqual({
        budgetAllocated: 100,
        realizedRevenue: 50,
        roi: 50,
      });
    });

    it('returns ROI 0 when no budget', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ total: '99' }], rowCount: 1 } as never);

      await expect(service.getOverview()).resolves.toMatchObject({ roi: 0 });
    });

    it('parses decimals and rounds ROI', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '33.5' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 } as never);

      const r = await service.getOverview();
      expect(r.budgetAllocated).toBeCloseTo(33.5);
      expect(r.realizedRevenue).toBe(10);
      expect(r.roi).toBe(29.85);
    });
  });

  describe('allocateBudget', () => {
    it('updates existing row, logs, returns allocations', async () => {
      const row = { id: 's1', system_slug: 'craftor', name: 'C', budget_allocated: 500 };
      mockQuery
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const result = await service.allocateBudget('u1', {
        systemSlug: 'craftor',
        amount: 25,
        reason: 'Q1 push',
      });

      expect(result).toEqual({
        allocations: [row],
        updatedCount: 1,
      });
      expect(mockQuery.mock.calls[0][0]).toContain('AND user_id = $3');
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO logs');
      expect((mockQuery.mock.calls[1][1] as unknown[])[0]).toBe('u1');
    });

    it('inserts ecosystem row then updates when none exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        .mockResolvedValueOnce({
          rows: [{ id: 'new1', system_slug: 'craftor', name: 'craftor', budget_allocated: 25 }],
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const result = await service.allocateBudget('admin1', {
        systemSlug: 'craftor',
        amount: 25,
        reason: 'Q1 push',
      });

      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO ecosystem_systems');
      expect((mockQuery.mock.calls[1][1] as unknown[])[0]).toBe('admin1');
      expect(mockQuery.mock.calls[2][0]).toContain('UPDATE ecosystem_systems');
      expect(result.updatedCount).toBe(1);
    });
  });
});

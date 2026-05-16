import { KpiService } from '../../modules/kpi/service/kpi.service';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('KpiService', () => {
  let service: KpiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new KpiService();
  });

  it('getDashboard aggregates all queries', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ c: '10' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '3' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ s: '99.5' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '1' }], rowCount: 1 } as never);

    await expect(service.getDashboard()).resolves.toEqual({
      activeUsers: 10,
      activeSubscriptions: 3,
      totalRevenue: 99.5,
      activeTasks: 2,
      activeEcosystemSystems: 1,
    });
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });
});

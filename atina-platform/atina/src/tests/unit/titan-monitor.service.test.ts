import { TitanMonitorService } from '../../modules/titan-monitor/service/titan-monitor.service';

// eslint-disable-next-line no-var
var titanMonitorRepo: { snapshot: jest.Mock };

jest.mock('../../modules/titan-monitor/repository/titan-monitor.repository', () => {
  titanMonitorRepo = { snapshot: jest.fn() };
  return {
    TitanMonitorRepository: jest.fn().mockImplementation(() => titanMonitorRepo),
  };
});

describe('TitanMonitorService', () => {
  let service: TitanMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TitanMonitorService();
  });

  it('merges repository counts with a bounded healthScore and timestamp', async () => {
    titanMonitorRepo.snapshot.mockResolvedValueOnce({
      activeUsers: 10,
      totalRevenue: 5000,
      activeTasks: 2,
      activeEcosystems: 3,
    });

    const result = await service.getSnapshot();

    expect(result).toMatchObject({
      activeUsers: 10,
      totalRevenue: 5000,
      activeTasks: 2,
      activeEcosystems: 3,
      healthScore: 56,
    });
    expect(typeof result.monitoredAt).toBe('string');
    expect(Number.isNaN(Date.parse(result.monitoredAt))).toBe(false);
  });

  it('caps healthScore at 100 for very large inputs', async () => {
    titanMonitorRepo.snapshot.mockResolvedValueOnce({
      activeUsers: 1000,
      totalRevenue: 1_000_000,
      activeTasks: 0,
      activeEcosystems: 20,
    });

    const result = await service.getSnapshot();
    expect(result.healthScore).toBe(100);
  });
});

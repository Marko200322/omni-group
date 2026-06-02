import { ScalingService } from '../../modules/scaling/service/scaling.service';
import { ScalingRepository } from '../../modules/scaling/repository/scaling.repository';

jest.mock('../../modules/scaling/repository/scaling.repository');

describe('ScalingService', () => {
  const avgUtil = ScalingRepository.prototype.avgUtilization as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recommends scale_up when no nodes', async () => {
    avgUtil.mockResolvedValue({ rows: [{ avg_util: '0', node_count: '0' }] });
    const svc = new ScalingService();
    const out = await svc.evaluate({ targetUtilizationPct: 75 });
    expect(out.action).toBe('scale_up');
    expect(out.activeNodes).toBe(0);
  });

  it('recommends scale_up when utilization above target', async () => {
    avgUtil.mockResolvedValue({ rows: [{ avg_util: '92', node_count: '3' }] });
    const svc = new ScalingService();
    const out = await svc.evaluate({ targetUtilizationPct: 75 });
    expect(out.action).toBe('scale_up');
  });

  it('recommends none when within band', async () => {
    avgUtil.mockResolvedValue({ rows: [{ avg_util: '70', node_count: '2' }] });
    const svc = new ScalingService();
    const out = await svc.evaluate({ targetUtilizationPct: 75 });
    expect(out.action).toBe('none');
  });
});

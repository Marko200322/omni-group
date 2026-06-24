import { ScalingService } from '../../modules/scaling/service/scaling.service';
import { ScalingRepository } from '../../modules/scaling/repository/scaling.repository';

jest.mock('../../modules/scaling/repository/scaling.repository');

describe('ScalingService', () => {
  const avgUtil = ScalingRepository.prototype.avgUtilization as jest.Mock;
  const listActive = ScalingRepository.prototype.listActive as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listNodes returns repository rows', async () => {
    listActive.mockResolvedValue({ rows: [{ node_name: 'n1' }] });
    const svc = new ScalingService();
    await expect(svc.listNodes()).resolves.toEqual([{ node_name: 'n1' }]);
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

  it('recommends scale_down when utilization is low and multiple nodes exist', async () => {
    avgUtil.mockResolvedValue({ rows: [{ avg_util: '30', node_count: '3' }] });
    const svc = new ScalingService();
    const out = await svc.evaluate({ targetUtilizationPct: 75, workloadKey: 'api' });
    expect(out.action).toBe('scale_down');
    expect(out.workloadKey).toBe('api');
  });

  it('registerNode delegates to repository', async () => {
    const register = ScalingRepository.prototype.register as jest.Mock;
    register.mockResolvedValue({
      rows: [{ node_name: 'n1', zone: 'eu', capacity_score: 90 }],
    });
    const svc = new ScalingService();
    const node = await svc.registerNode('n1', 'eu', 90, { region: 'west' });
    expect(node).toEqual({ node_name: 'n1', zone: 'eu', capacity_score: 90 });
    expect(register).toHaveBeenCalledWith('n1', 'eu', 90, { region: 'west' });
  });
});

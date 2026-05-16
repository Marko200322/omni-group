import { TitanMonitorRepository } from '../repository/titan-monitor.repository';

export class TitanMonitorService {
  private readonly repo = new TitanMonitorRepository();

  async getSnapshot() {
    const s = await this.repo.snapshot();
    const healthScore = Math.max(
      0,
      Math.min(100, 40 + Math.min(30, s.activeUsers / 5) + Math.min(20, s.activeEcosystems * 3) + Math.min(10, s.totalRevenue / 1000))
    );
    return {
      ...s,
      healthScore: Number(healthScore.toFixed(2)),
      monitoredAt: new Date().toISOString(),
    };
  }
}

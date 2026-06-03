import { KpiRepository } from '../repository/kpi.repository';

export type KpiDashboard = {
  activeUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  activeTasks: number;
  activeEcosystemSystems: number;
};

export class KpiService {
  private readonly repo: KpiRepository;

  constructor(repo?: KpiRepository) {
    this.repo = repo ?? new KpiRepository();
  }

  async getDashboard(): Promise<KpiDashboard> {
    const [users, subs, rev, tasks, eco] = await Promise.all([
      this.repo.countActiveUsers(),
      this.repo.countActiveSubscriptions(),
      this.repo.sumCompletedPayments(),
      this.repo.countActiveTasks(),
      this.repo.countActiveEcosystemSystems(),
    ]);

    return {
      activeUsers: parseInt(users.rows[0].c, 10),
      activeSubscriptions: parseInt(subs.rows[0].c, 10),
      totalRevenue: parseFloat(rev.rows[0].s),
      activeTasks: parseInt(tasks.rows[0].c, 10),
      activeEcosystemSystems: parseInt(eco.rows[0].c, 10),
    };
  }
}

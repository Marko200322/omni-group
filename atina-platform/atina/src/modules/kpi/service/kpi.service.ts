import { query } from '../../../database/connection';

export type KpiDashboard = {
  activeUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  activeTasks: number;
  activeEcosystemSystems: number;
};

export class KpiService {
  async getDashboard(): Promise<KpiDashboard> {
    const [users, subs, rev, tasks, eco] = await Promise.all([
      query<{ c: string }>('SELECT COUNT(*) AS c FROM users WHERE is_active = true'),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'"),
      query<{ s: string }>("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'completed'"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM tasks WHERE status IN ('queued','running')"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM ecosystem_systems WHERE status = 'active'"),
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

import { query } from '../../../database/connection';

export class TitanMonitorRepository {
  async snapshot() {
    const [users, payments, tasks, systems] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM users WHERE is_active = true'),
      query<{ total: string }>("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'completed'"),
      query<{ count: string }>("SELECT COUNT(*) FROM tasks WHERE status IN ('queued','running','retrying')"),
      query<{ count: string }>("SELECT COUNT(*) FROM ecosystem_systems WHERE status = 'active'"),
    ]);
    return {
      activeUsers: parseInt(users.rows[0].count, 10),
      totalRevenue: parseFloat(payments.rows[0].total),
      activeTasks: parseInt(tasks.rows[0].count, 10),
      activeEcosystems: parseInt(systems.rows[0].count, 10),
    };
  }
}

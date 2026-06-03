import { query } from '../../../database/connection';

export class KpiRepository {
  countActiveUsers() {
    return query<{ c: string }>('SELECT COUNT(*) AS c FROM users WHERE is_active = true');
  }

  countActiveSubscriptions() {
    return query<{ c: string }>("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'");
  }

  sumCompletedPayments() {
    return query<{ s: string }>("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'completed'");
  }

  countActiveTasks() {
    return query<{ c: string }>("SELECT COUNT(*) AS c FROM tasks WHERE status IN ('queued','running')");
  }

  countActiveEcosystemSystems() {
    return query<{ c: string }>("SELECT COUNT(*) AS c FROM ecosystem_systems WHERE status = 'active'");
  }
}

import { AuditLogRepository } from '../repository/audit-log.repository';

export class AuditLogService {
  private readonly repo = new AuditLogRepository();

  async record(actorUserId: string | null, eventType: string, entityType: string, entityId: string, severity: string, payload: Record<string, unknown>) {
    const { rows } = await this.repo.insert(actorUserId, eventType, entityType, entityId, severity, payload);
    return rows[0];
  }

  async list(limit = 200) {
    const { rows } = await this.repo.list(limit);
    return rows;
  }
}

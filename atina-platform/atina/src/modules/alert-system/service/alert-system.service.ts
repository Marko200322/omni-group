import { NotFoundError } from '../../../utils/errors';
import type { AlertListQueryType, CreateAlertDtoType } from '../dto/alert-system.dto';
import { AlertSystemRepository } from '../repository/alert-system.repository';

export class AlertSystemService {
  private readonly repo = new AlertSystemRepository();

  async list(userId: string, query: AlertListQueryType) {
    const limit = query.limit;
    const offset = (query.page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      this.repo.listByUser(userId, {
        status: query.status,
        severity: query.severity,
        limit,
        offset,
      }),
      this.repo.countByUser(userId, { status: query.status, severity: query.severity }),
    ]);
    return {
      items: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page: query.page,
      limit,
    };
  }

  async create(userId: string, dto: CreateAlertDtoType) {
    const { rows } = await this.repo.create(userId, {
      title: dto.title,
      message: dto.message,
      severity: dto.severity,
      category: dto.category,
      sourceModule: dto.sourceModule,
      metadata: dto.metadata,
    });
    return rows[0];
  }

  async acknowledge(alertId: string, userId: string) {
    const { rows } = await this.repo.acknowledge(alertId, userId);
    if (!rows[0]) throw new NotFoundError('Alert');
    return rows[0];
  }

  async resolve(alertId: string, userId: string) {
    const { rows } = await this.repo.resolve(alertId, userId);
    if (!rows[0]) throw new NotFoundError('Alert');
    return rows[0];
  }

  async summary(userId: string) {
    const { rows } = await this.repo.summaryByUser(userId);
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + parseInt(r.count, 10);
      byStatus[r.status] = (byStatus[r.status] ?? 0) + parseInt(r.count, 10);
    }
    return { bySeverity, byStatus, rows };
  }

  async listOpenAdmin(limit = 50) {
    const { rows } = await this.repo.listOpenAdmin(Math.min(100, Math.max(1, limit)));
    return rows;
  }
}

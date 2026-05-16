import { NotFoundError } from '../../../utils/errors';
import { GdprRepository } from '../repository/gdpr.repository';

export class GdprService {
  private readonly repo = new GdprRepository();

  async create(userId: string, requestType: string, payload: Record<string, unknown>) {
    const { rows } = await this.repo.create(userId, requestType, payload);
    return rows[0];
  }

  async listForUser(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async listAll() {
    const { rows } = await this.repo.listAll();
    return rows;
  }

  async process(id: string, status: string, response: Record<string, unknown>) {
    const { rows } = await this.repo.process(id, status, response);
    if (!rows[0]) throw new NotFoundError('GDPR request');
    return rows[0];
  }
}

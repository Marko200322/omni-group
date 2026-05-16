import { NotFoundError } from '../../../utils/errors';
import { SystemUpdaterRepository } from '../repository/system-updater.repository';

export class SystemUpdaterService {
  private readonly repo = new SystemUpdaterRepository();

  async queue(requestedBy: string, targetVersion: string, notes: string) {
    const { rows } = await this.repo.queue(requestedBy, targetVersion, notes);
    return rows[0];
  }

  async list() {
    const { rows } = await this.repo.list();
    return rows;
  }

  async finish(id: string, status: string, result: Record<string, unknown>) {
    const { rows } = await this.repo.finish(id, status, result);
    if (!rows[0]) throw new NotFoundError('Updater job');
    return rows[0];
  }
}

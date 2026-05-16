import { NotFoundError } from '../../../utils/errors';
import { LoadBalancerRepository } from '../repository/load-balancer.repository';

export class LoadBalancerService {
  private readonly repo = new LoadBalancerRepository();

  async register(nodeName: string, zone: string, capacityScore: number, metadata: Record<string, unknown>) {
    const { rows } = await this.repo.register(nodeName, zone, capacityScore, metadata);
    return rows[0];
  }

  async list() {
    const { rows } = await this.repo.listActive();
    return rows;
  }

  async dispatch(workloadKey: string) {
    const { rows } = await this.repo.listActive();
    if (!rows[0]) throw new NotFoundError('Active node');
    const selected = rows[0];
    const delta = Math.max(1, (workloadKey.length % 7) + 1);
    const { rows: updated } = await this.repo.addLoad(selected.id as string, delta);
    return {
      node: updated[0],
      workloadKey,
      loadAdded: delta,
    };
  }
}

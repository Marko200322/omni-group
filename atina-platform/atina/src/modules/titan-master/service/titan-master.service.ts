import { NotFoundError } from '../../../utils/errors';
import {
  CreateTitanMasterDtoType,
  RunTitanMasterDtoType,
} from '../dto/titan-master.dto';
import { TitanMasterRepository } from '../repository/titan-master.repository';

export class TitanMasterService {
  private readonly repo = new TitanMasterRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateTitanMasterDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.stage,
      dto.budgetAllocated,
      dto.objective
    );
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunTitanMasterDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('Titan Master system');

    const projectedGain = this.getProjectedGain(dto.mode);
    const normalizedInput = this.normalizePayload(dto.input);
    const normalizedOutput = {
      strategy: dto.mode,
      projected_gain: projectedGain,
      recommendation: 'Rebalance resources toward highest-conversion workflows.',
      audit: {
        normalized: true,
        mode: dto.mode,
      },
    };

    const { rows } = await this.repo.createRun(
      systemId,
      `titan_master_${dto.mode}`,
      normalizedInput,
      normalizedOutput
    );
    await this.repo.updateAfterRun(systemId, projectedGain);
    return rows[0];
  }

  async adminOverview() {
    const { rows } = await this.repo.getAdminOverview();
    return rows[0];
  }

  private getProjectedGain(mode: RunTitanMasterDtoType['mode']): number {
    if (mode === 'expand') return 250;
    if (mode === 'stabilize') return 80;
    return 150;
  }

  private normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  }
}

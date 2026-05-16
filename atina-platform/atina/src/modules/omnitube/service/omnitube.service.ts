import { NotFoundError } from '../../../utils/errors';
import { CreateOmniTubeDtoType, RunOmniTubeDtoType } from '../dto/omnitube.dto';
import { OmniTubeRepository } from '../repository/omnitube.repository';

export class OmniTubeService {
  private readonly repo = new OmniTubeRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateOmniTubeDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.platform);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunOmniTubeDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('OmniTube channel');

    const revenue = dto.mode === 'publish' ? 90 : dto.mode === 'optimize' ? 120 : 30;
    const unitsProduced = dto.mode === 'publish' ? 3200 : dto.mode === 'optimize' ? 5100 : 700;
    const runScore = dto.mode === 'optimize' ? 91 : dto.mode === 'publish' ? 84 : 68;

    const normalizedOutput = {
      module: 'omnitube',
      mode: dto.mode,
      estimated_revenue: revenue,
      run_score: runScore,
      units_produced: unitsProduced,
      unit_label: 'views',
      details: {
        views_generated: unitsProduced,
      },
    };

    const { rows: runRows } = await this.repo.createRun(systemId, `omnitube_${dto.mode}`, normalizedOutput);
    await this.repo.updateAfterRun(systemId, revenue, dto.mode, unitsProduced, runScore);
    return runRows[0];
  }
}

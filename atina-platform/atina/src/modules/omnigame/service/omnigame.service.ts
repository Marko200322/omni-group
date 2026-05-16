import { NotFoundError } from '../../../utils/errors';
import { CreateOmniGameDtoType, RunOmniGameDtoType } from '../dto/omnigame.dto';
import { OmniGameRepository } from '../repository/omnigame.repository';

export class OmniGameService {
  private readonly repo = new OmniGameRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateOmniGameDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.genre);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunOmniGameDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('OmniGame project');

    const revenue = dto.mode === 'publish' ? 480 : dto.mode === 'validate' ? 110 : 70;
    const runScore = dto.mode === 'validate' ? 84 : dto.mode === 'prototype' ? 62 : 55;
    const unitsProduced = dto.mode === 'publish' ? 9 : dto.mode === 'prototype' ? 3 : 1;

    const normalizedOutput = {
      module: 'omnigame',
      mode: dto.mode,
      estimated_revenue: revenue,
      run_score: runScore,
      units_produced: unitsProduced,
      unit_label: 'builds',
      details: {
        validation_score: runScore,
      },
    };

    const { rows: runRows } = await this.repo.createRun(systemId, `omnigame_${dto.mode}`, normalizedOutput);
    await this.repo.updateAfterRun(systemId, revenue, dto.mode, unitsProduced, runScore);
    return runRows[0];
  }
}

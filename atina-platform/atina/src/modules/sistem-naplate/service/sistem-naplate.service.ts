import { AppError, NotFoundError } from '../../../utils/errors';
import { CreateSistemNaplateWorkspaceDtoType, RunSistemNaplateDtoType } from '../dto/sistem-naplate.dto';
import { SistemNaplateRepository } from '../repository/sistem-naplate.repository';

export class SistemNaplateService {
  private readonly repo = new SistemNaplateRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateSistemNaplateWorkspaceDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.budgetAllocated,
      dto.billingCadence
    );
    if (!rows[0]) {
      throw new AppError('Failed to create sistem naplate workspace', 500, 'SISTEM_NAPLATE_CREATE_FAILED');
    }
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunSistemNaplateDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) {
      throw new NotFoundError(`Sistem naplate workspace (${systemId})`);
    }

    const processed =
      dto.mode === 'reconcile' ? dto.batchSize : dto.mode === 'invoice' ? Math.ceil(dto.batchSize * 0.9) : Math.ceil(dto.batchSize * 0.75);
    const revenue =
      dto.mode === 'settlement' ? processed * 9 : dto.mode === 'invoice' ? processed * 5 : processed * 3;

    const { rows } = await this.repo.createRun(systemId, `sistem_naplate_${dto.mode}`, {
      mode: dto.mode,
      batch_size: dto.batchSize,
      records_processed: processed,
      estimated_revenue: revenue,
    });
    if (!rows[0]) {
      throw new AppError('Failed to persist sistem naplate run', 500, 'SISTEM_NAPLATE_RUN_PERSIST_FAILED');
    }
    await this.repo.updateAfterRun(systemId, dto.mode, dto.batchSize, processed, revenue);
    return rows[0];
  }
}

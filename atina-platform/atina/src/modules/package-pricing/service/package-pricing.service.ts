import { NotFoundError, ValidationError } from '../../../utils/errors';
import type { CreatePackagePricingDtoType, RunPackagePricingDtoType } from '../dto/package-pricing.dto';
import {
  computePackagePricingRun,
  type PricingMetrics,
} from '../package-pricing.stub';
import { PackagePricingRepository } from '../repository/package-pricing.repository';

export class PackagePricingService {
  private readonly repo = new PackagePricingRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreatePackagePricingDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.basePrice);
    const row = rows[0];
    if (row?.id) {
      await this.repo.auditCreated(userId, String(row.id), { name: dto.name });
    }
    return row;
  }

  async run(systemId: string, userId: string, dto: RunPackagePricingDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('Package pricing workspace');

    const metrics = ((systems[0] as { metrics?: PricingMetrics }).metrics ?? {}) as PricingMetrics;
    const computed = computePackagePricingRun(dto.mode, metrics, dto.input, systemId);
    if ('error' in computed) {
      throw new ValidationError(computed.error.message);
    }

    const inputPayload = { mode: dto.mode, input: dto.input };
    const runType = `package-pricing_${dto.mode}`;
    const { rows: runRows } = await this.repo.createRun(
      systemId,
      runType,
      inputPayload,
      computed.outputPayload
    );
    await this.repo.updateAfterRun(systemId, computed.revenueDelta, computed.metricsPatch);
    if (runRows[0]?.id) {
      await this.repo.auditRunCompleted(userId, String(runRows[0].id), { mode: dto.mode, systemId });
    }
    return runRows[0];
  }
}

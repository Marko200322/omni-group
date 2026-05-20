import { getBusinessDevClient } from '../../../integrations';
import { NotFoundError } from '../../../utils/errors';
import { digitalSignatureStubOutput } from '../digital-signature.stub';
import type { CreateDigitalSignatureDtoType, RunDigitalSignatureDtoType } from '../dto/digital-signature.dto';
import { DigitalSignatureRepository } from '../repository/digital-signature.repository';

export class DigitalSignatureService {
  private readonly repo = new DigitalSignatureRepository();
  private readonly businessDev = getBusinessDevClient();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateDigitalSignatureDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated);
    const row = rows[0];
    if (row?.id) {
      await this.repo.auditCreated(userId, String(row.id), { name: dto.name });
    }
    return row;
  }

  async run(systemId: string, userId: string, dto: RunDigitalSignatureDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    if (!systems[0]) throw new NotFoundError('Digital signature workspace');

    const inputPayload = dto.input as Record<string, unknown>;
    let result = digitalSignatureStubOutput(dto.mode, inputPayload);

    if (this.businessDev.isConfigured()) {
      const remote = await this.businessDev.request<Record<string, unknown>>(
        'POST',
        '/v1/signatures/run',
        { mode: dto.mode, input: inputPayload, systemId }
      );
      if (remote && typeof remote === 'object') {
        result = { ...result, ...remote, source: 'business_dev_aggregator' };
      }
    }

    const outputPayload = { mode: dto.mode, result };
    const runType = `digital_signature_${dto.mode}`;
    const { rows: runRows } = await this.repo.createRun(systemId, runType, { mode: dto.mode, input: inputPayload }, outputPayload);
    await this.repo.updateAfterRun(systemId, dto.mode, runType);
    if (runRows[0]?.id) {
      await this.repo.auditRunCompleted(userId, String(runRows[0].id), { mode: dto.mode, systemId });
    }
    return runRows[0];
  }
}

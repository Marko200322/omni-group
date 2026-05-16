import { ConflictError, NotFoundError } from '../../../utils/errors';
import { CreateForgeDtoType, ForgeStatusDto, ForgeStatusDtoType, RunForgeDtoType } from '../dto/forge.dto';
import { getStorageClient } from '../../../integrations';
import { ForgeRepository } from '../repository/forge.repository';
import { TitanForgeService } from './titan-forge.service';

export class ForgeService {
  private readonly repo = new ForgeRepository();
  private readonly titanForge = new TitanForgeService();
  private readonly storage = getStorageClient();
  private static readonly IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE =
    'Idempotency key already used with different forge run parameters';

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateForgeDtoType) {
    const { rows } = await this.repo.create(
      userId,
      dto.name,
      dto.budgetAllocated,
      dto.operatingMode
    );
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunForgeDtoType, rawIdempotencyKey?: string) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Forge workspace');

    const idempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : '';
    if (idempotencyKey) {
      return this.repo.withIdempotencyLock(systemId, idempotencyKey, async () => {
        const { rows: existingRuns } = await this.repo.findRecentRunByIdempotencyKey(systemId, idempotencyKey);
        if (existingRuns[0]) {
          this.assertIdempotentPayloadMatches(existingRuns[0], dto.mode, dto.intensity);
          return existingRuns[0];
        }

        const forgeOutput = await this.titanForge.forge(dto.mode, dto.intensity);
        const { outputPayload, revenue } = this.buildRunOutput(dto, forgeOutput, idempotencyKey);
        const { rows } = await this.repo.createRun(systemId, `forge_${dto.mode}`, outputPayload);
        await this.repo.updateAfterRun(systemId, revenue, dto.mode, dto.intensity);
        await this.maybeUploadDeployArtifact(systemId, dto, outputPayload);
        return rows[0];
      });
    }

    const forgeOutput = await this.titanForge.forge(dto.mode, dto.intensity);
    const { outputPayload, revenue } = this.buildRunOutput(dto, forgeOutput, idempotencyKey);

    const { row, reused } = await this.repo.createRunAndUpdateWithIdempotency(
      systemId,
      `forge_${dto.mode}`,
      outputPayload,
      revenue,
      dto.mode,
      dto.intensity,
      idempotencyKey
    );

    if (reused) {
      this.assertIdempotentPayloadMatches(row, dto.mode, dto.intensity);
    } else {
      await this.maybeUploadDeployArtifact(systemId, dto, outputPayload);
    }

    return row;
  }

  private assertIdempotentPayloadMatches(row: Record<string, unknown>, mode: string, intensity: number) {
    const replayPayload = row.output_payload as { mode?: unknown; intensity?: unknown } | undefined;
    const sameMode = replayPayload?.mode === mode;
    const sameIntensity = replayPayload?.intensity === intensity;
    if (!sameMode || !sameIntensity) {
      throw new ConflictError(ForgeService.IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
    }
  }

  private buildRunOutput(
    dto: RunForgeDtoType,
    forgeOutput: {
      provider: string;
      costRsd: number;
      remainingBudgetRsd: number;
      resourceId: string;
      eventId: string;
    },
    idempotencyKey: string
  ) {
    const stability = dto.mode === 'deploy' ? 92 : dto.mode === 'temper' ? 86 : 78;
    const throughput = dto.mode === 'deploy'
      ? dto.intensity * 4
      : dto.mode === 'temper'
        ? dto.intensity * 3
        : dto.intensity * 2;
    const revenue = throughput * (dto.mode === 'deploy' ? 3 : dto.mode === 'temper' ? 2 : 1);
    const outputPayload = {
      throughput,
      stability,
      estimated_revenue: revenue,
      intensity: dto.intensity,
      mode: dto.mode,
      idempotency_key: idempotencyKey || null,
      provider: forgeOutput.provider,
      forge_cost_rsd: forgeOutput.costRsd,
      remaining_budget_rsd: forgeOutput.remainingBudgetRsd,
      resource_id: forgeOutput.resourceId,
      event_id: forgeOutput.eventId,
    };
    return { outputPayload, revenue };
  }

  private async maybeUploadDeployArtifact(
    systemId: string,
    dto: RunForgeDtoType,
    outputPayload: Record<string, unknown>
  ): Promise<void> {
    if (dto.mode !== 'deploy' || !this.storage.isConfigured()) {
      return;
    }
    await this.storage.uploadArtifact({
      path: `forge/${systemId}/deploy-${Date.now()}.json`,
      contentBase64: Buffer.from(JSON.stringify(outputPayload), 'utf8').toString('base64'),
      contentType: 'application/json',
      metadata: { mode: dto.mode, intensity: dto.intensity },
    });
  }

  async status(): Promise<ForgeStatusDtoType> {
    const status = await this.titanForge.getStatus();
    return ForgeStatusDto.parse(status);
  }
}

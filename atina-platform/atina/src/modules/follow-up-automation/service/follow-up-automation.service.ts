import { NotFoundError } from '../../../utils/errors';
import {
  CreateFollowUpAutomationDtoType,
  FollowUpAutomationStatusDto,
  FollowUpAutomationStatusDtoType,
  RunFollowUpAutomationDtoType,
} from '../dto/follow-up-automation.dto';
import { FollowUpAutomationRepository } from '../repository/follow-up-automation.repository';

export class FollowUpAutomationService {
  private readonly repo = new FollowUpAutomationRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateFollowUpAutomationDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.followUpStrategy);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunFollowUpAutomationDtoType) {
    const { rows: found } = await this.repo.getOwned(systemId, userId);
    if (!found[0]) throw new NotFoundError('Follow-up Automation workspace');

    const estRevenue = Number(dto.revenueEstimate ?? 45);
    const modeMultiplier =
      dto.mode === 'schedule' ? 1.0 : dto.mode === 'escalate' ? 1.15 : 0.92;
    const followUpsCompleted = Math.max(1, Math.round((dto.intensity / 10) * modeMultiplier));
    const qualityScore = Math.min(100, 52 + Math.round(dto.intensity / 3));

    const { rows } = await this.repo.createRun(systemId, `follow-up-automation_${dto.mode}`, {
      followUpsCompleted,
      qualityScore,
      estimatedRevenue: estRevenue,
      mode: dto.mode,
      intensity: dto.intensity,
    });
    await this.repo.updateAfterRun(systemId, estRevenue, dto.mode, dto.intensity, followUpsCompleted);
    return rows[0];
  }

  async status(): Promise<FollowUpAutomationStatusDtoType> {
    const status = {
      strategies: ['aggressive', 'balanced', 'light'] as const,
      activeStrategy: 'balanced' as const,
      pipelineCapacity: {
        maxFollowUpsPerRun: 400,
        cooldownSeconds: 25,
      },
    };
    return FollowUpAutomationStatusDto.parse(status);
  }
}

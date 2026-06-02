import { PhaseLaunchRepository } from '../repository/phase-launch.repository';
import { SetPhaseDtoType } from '../dto/phase-launch.dto';
import { getInfrastructureClient } from '../../../integrations';
import {
  getModulePhaseGatingStatus,
  getPhaseOrder,
  resetPhaseActivationCache,
  type Phase,
} from '../middleware/phase-activation.middleware';

export class PhaseLaunchService {
  private readonly repo = new PhaseLaunchRepository();
  private readonly infrastructure = getInfrastructureClient();

  async getCurrentPhase() {
    await this.repo.ensureFlag();
    const { rows } = await this.repo.getFlag();
    const config = (rows[0]?.config ?? {}) as Record<string, unknown>;
    return {
      currentPhase: String(config.current_phase ?? 'v1'),
      notes: String(config.notes ?? ''),
      updatedAt: config.updated_at ?? null,
    };
  }

  async setCurrentPhase(dto: SetPhaseDtoType) {
    await this.repo.ensureFlag();
    await this.repo.setFlag(dto.phase, dto.notes ?? '');
    resetPhaseActivationCache();
    return this.getCurrentPhase();
  }

  async setCurrentPhaseWithAudit(actorUserId: string, dto: SetPhaseDtoType) {
    const before = await this.getCurrentPhase();
    const after = await this.setCurrentPhase(dto);
    const auditTimestamp = new Date().toISOString();

    await this.repo.insertPhaseLaunchAudit(
      actorUserId,
      JSON.stringify({
        timestamp: auditTimestamp,
        fromPhase: before.currentPhase,
        toPhase: after.currentPhase,
        notes: after.notes,
        phaseOrder: getPhaseOrder(),
        gatingSnapshot: getModulePhaseGatingStatus(after.currentPhase as Phase),
      })
    );

    let deploy: Record<string, unknown> | null = null;
    if (this.infrastructure.isConfigured()) {
      deploy = await this.infrastructure.triggerDeploy({
        phase: after.currentPhase,
        notes: after.notes,
        actorUserId,
      });
    }

    return {
      ...after,
      changed: before.currentPhase !== after.currentPhase,
      previousPhase: before.currentPhase,
      ...(deploy ? { deploy } : {}),
    };
  }
}

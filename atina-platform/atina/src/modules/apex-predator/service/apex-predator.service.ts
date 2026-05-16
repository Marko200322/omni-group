import { NotFoundError } from '../../../utils/errors';
import {
  ApexDomainStateType,
  ApexRiskProfileType,
  ApexRunModeType,
  CreateApexPredatorDtoType,
  RunApexPredatorDtoType,
} from '../dto/apex-predator.dto';
import { ApexPredatorRepository } from '../repository/apex-predator.repository';

type ApexSystemRow = {
  budget_allocated?: number;
  efficiency_score?: number;
  config?: { risk_profile?: ApexRiskProfileType; domain_state?: ApexDomainStateType } | null;
  metrics?: { domain_state?: ApexDomainStateType } | null;
};

const MODE_TO_STATE: Record<ApexRunModeType, ApexDomainStateType> = {
  outreach: 'prospecting',
  upsell: 'monetizing',
  retention: 'stabilizing',
  'risk-shield': 'shielding',
};

const RISK_MULTIPLIER: Record<ApexRiskProfileType, number> = {
  low: 0.9,
  medium: 1,
  high: 1.15,
};

const TRANSITION_MULTIPLIER: Record<ApexDomainStateType, Record<ApexDomainStateType, number>> = {
  prospecting: { prospecting: 1, monetizing: 1.14, stabilizing: 0.96, shielding: 0.88 },
  monetizing: { prospecting: 0.92, monetizing: 1.06, stabilizing: 1.03, shielding: 0.9 },
  stabilizing: { prospecting: 0.94, monetizing: 1.08, stabilizing: 1, shielding: 1.04 },
  shielding: { prospecting: 0.9, monetizing: 0.95, stabilizing: 1.06, shielding: 1 },
};

export class ApexPredatorService {
  private readonly repo = new ApexPredatorRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateApexPredatorDtoType) {
    const { rows } = await this.repo.create(userId, dto.name, dto.budgetAllocated, dto.riskProfile);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunApexPredatorDtoType) {
    const { rows: foundRows } = await this.repo.getOwned(systemId, userId);
    const system = foundRows[0] as ApexSystemRow | undefined;
    if (!system) throw new NotFoundError('Apex Predator profile');

    const output = this.buildRunOutput(system, dto.mode, dto.intensity);
    const { rows } = await this.repo.createRun(systemId, `apex_${dto.mode}`, output);
    await this.repo.updateAfterRun(
      systemId,
      output.estimatedRevenue,
      output.efficiencyDelta,
      dto.mode,
      output.conversionRate,
      output.nextDomainState
    );
    return rows[0];
  }

  async riskGrid() {
    const { rows } = await this.repo.listRiskGrid();
    return rows;
  }

  private buildRunOutput(system: ApexSystemRow, mode: ApexRunModeType, intensity: number) {
    const riskProfile = (system.config?.risk_profile ?? 'medium') as ApexRiskProfileType;
    const budget = Number(system.budget_allocated ?? 0);
    const efficiency = Number(system.efficiency_score ?? 0);
    const previousState = (system.metrics?.domain_state ?? system.config?.domain_state ?? 'prospecting') as ApexDomainStateType;
    const nextState = MODE_TO_STATE[mode];

    const baseRevenue = mode === 'upsell' ? 420 : mode === 'retention' ? 260 : mode === 'risk-shield' ? 170 : 200;
    const modeConversionBase = mode === 'outreach' ? 6.8 : mode === 'upsell' ? 10.2 : mode === 'retention' ? 7.1 : 5.2;
    const transitionFactor = TRANSITION_MULTIPLIER[previousState][nextState];

    const intensityFactor = 0.7 + intensity / 100;
    const budgetFactor = Math.min(1.25, 1 + budget / 200000);
    const efficiencyFactor = 0.9 + Math.min(100, efficiency) / 250;

    const estimatedRevenue = Math.round(baseRevenue * intensityFactor * budgetFactor * RISK_MULTIPLIER[riskProfile] * transitionFactor);
    const conversionRate = Number((modeConversionBase * (0.6 + intensity / 120) * transitionFactor).toFixed(2));
    const retentionRate = Number((Math.min(98, 64 + intensity * 0.16 + (nextState === 'stabilizing' ? 10 : 0))).toFixed(2));
    const alertCount = Math.max(0, Math.round((riskProfile === 'high' ? 2 : 1) + (mode === 'risk-shield' ? -1 : 1)));
    const efficiencyDelta = Number((Math.max(1.8, Math.min(4.4, 1.2 + intensity / 40)) * transitionFactor * efficiencyFactor).toFixed(2));

    return {
      mode,
      intensity,
      riskProfile,
      previousDomainState: previousState,
      nextDomainState: nextState,
      conversionRate,
      retentionRate,
      estimatedRevenue,
      alertCount,
      efficiencyDelta,
      // Legacy aliases kept for compatibility with existing consumers.
      conversion_rate: conversionRate,
      retention_rate: retentionRate,
      estimated_revenue: estimatedRevenue,
      alerts: alertCount,
      previous_domain_state: previousState,
      next_domain_state: nextState,
    };
  }
}

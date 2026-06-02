import { NotFoundError } from '../../../utils/errors';
import {
  ApexDomainStateType,
  ApexRiskProfileType,
  ApexRunModeType,
  CreateApexPredatorDtoType,
  RunApexPredatorDtoType,
} from '../dto/apex-predator.dto';
import { config } from '../../../config';
import { getAiClient } from '../../../integrations';
import { ApexPredatorRepository } from '../repository/apex-predator.repository';
import { apexMediaProviderStatuses, resolveApexMediaProviders } from '../providers';

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

/** Content Tier System — EUR 10–1000 (Master spec). */
export const APEX_CONTENT_TIERS_EUR = [
  { tier: 'starter', minEur: 10, maxEur: 49 },
  { tier: 'growth', minEur: 50, maxEur: 199 },
  { tier: 'pro', minEur: 200, maxEur: 499 },
  { tier: 'elite', minEur: 500, maxEur: 1000 },
] as const;

function resolveContentTier(estimatedRevenue: number): (typeof APEX_CONTENT_TIERS_EUR)[number] {
  const eur = Math.max(10, Math.min(1000, estimatedRevenue));
  const found =
    APEX_CONTENT_TIERS_EUR.find((t) => eur >= t.minEur && eur <= t.maxEur) ??
    APEX_CONTENT_TIERS_EUR[0];
  return found;
}

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

    const output = await this.buildRunOutput(system, dto.mode, dto.intensity);
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

  private async buildRunOutput(system: ApexSystemRow, mode: ApexRunModeType, intensity: number) {
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

    const batchCap = config.apex.maxSimBatchProfiles;
    const simulatedProfiles = Math.min(batchCap, Math.round(intensity * batchCap / 100));
    const contentTier = resolveContentTier(estimatedRevenue);

    const chargebackDefender =
      mode === 'risk-shield'
        ? { armed: true, blocked_attempts: Math.max(1, Math.round(alertCount * 1.5)), flux_trigger: false }
        : { armed: false, blocked_attempts: 0, flux_trigger: false };

    const suicideSwitch = {
      armed: config.apex.suicideSwitchArmed,
      destructive_action_allowed: false,
      message: config.apex.suicideSwitchArmed
        ? 'APEX_SUICIDE_SWITCH_ARMED=true — soft lock only; no destructive API without admin runbook'
        : 'Suicide switch disarmed (default)',
    };

    const mediaProviders = apexMediaProviderStatuses();
    const fluxConfigured = mediaProviders.find((p) => p.id === 'flux')?.configured ?? false;
    const livePortraitConfigured =
      mediaProviders.find((p) => p.id === 'live_portrait')?.configured ?? false;

    let narrativeMemory: Record<string, unknown> | null = null;
    let mediaGeneration: Record<string, unknown> | null = null;
    const ai = getAiClient();
    if (ai.isConfigured()) {
      await ai.remember({
        namespace: 'apex_fan_dna',
        key: `profile_${mode}`,
        value: { intensity, riskProfile, nextState },
      });
      narrativeMemory = {
        vector_store: 'ai_aggregator',
        fan_dna_synced: true,
        live_portrait_hook: livePortraitConfigured ? 'configured' : 'not_configured',
        flux_ip_adapter: fluxConfigured ? 'configured' : 'not_configured',
      };

      const providers = resolveApexMediaProviders().filter((p) => p.isConfigured() && p.generate);
      if (providers.length) {
        const results: Record<string, unknown> = {};
        for (const provider of providers) {
          const out = await provider.generate!({
            mode,
            intensity,
            riskProfile,
            contentTier: resolveContentTier(estimatedRevenue).tier,
          });
          if (out) results[provider.id] = out;
        }
        if (Object.keys(results).length) mediaGeneration = results;
      }
    }

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
      simulated_profiles_batch: simulatedProfiles,
      max_profiles_architecture: 125000,
      content_tier: {
        id: contentTier.tier,
        price_band_eur: { min: contentTier.minEur, max: contentTier.maxEur },
        deliverable_value_eur: estimatedRevenue,
      },
      chargeback_defender: chargebackDefender,
      suicide_switch: suicideSwitch,
      narrative_memory: narrativeMemory,
      media_providers: mediaProviders,
      media_generation: mediaGeneration,
    };
  }
}

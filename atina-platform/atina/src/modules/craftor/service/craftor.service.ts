import { NotFoundError, ValidationError } from '../../../utils/errors';
import {
  CRAFTOR_AGENTS,
  CRAFTOR_NICHES,
  CRAFTOR_PLATFORMS,
  CRAFTOR_VERSION,
  CRAFTOR_V7_MODES,
  CRAFTOR_WORKFLOW_STAGES,
  LEGACY_TO_V7_MODE,
  NICHE_COMMUNICATION_STYLE,
  type CraftorNiche,
  type CraftorV7Mode,
} from '../craftor.constants';
import type { CreateCraftorDtoType, CraftorRunModeType, RunCraftorDtoType } from '../dto/craftor.dto';
import { getAiClient } from '../../../integrations';
import { calculateSofraTax } from '../../../utils/sofra-tax';
import { CraftorRepository, type CraftorMetrics } from '../repository/craftor.repository';
import { NICHE_REVENUE_MULTIPLIER } from './craftor-mode-yields';
import { resolveCraftorYield } from './craftor-run.executor';

function nonNegativeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function resolveV7Mode(mode: CraftorRunModeType): CraftorV7Mode {
  if (mode in LEGACY_TO_V7_MODE) {
    return LEGACY_TO_V7_MODE[mode as keyof typeof LEGACY_TO_V7_MODE];
  }
  return mode as CraftorV7Mode;
}

export class CraftorService {
  private readonly repo = new CraftorRepository();

  getCatalog() {
    return {
      version: CRAFTOR_VERSION,
      vision: 'Universal AI operating layer for freelance platforms',
      platforms: [...CRAFTOR_PLATFORMS],
      niches: CRAFTOR_NICHES.map((id) => ({
        id,
        communicationStyle: NICHE_COMMUNICATION_STYLE[id],
      })),
      agents: [...CRAFTOR_AGENTS],
      modes: [...CRAFTOR_V7_MODES],
      workflow: [...CRAFTOR_WORKFLOW_STAGES],
      security: {
        proxyRotation: true,
        sessionIsolation: true,
        fingerprintManagement: true,
        rateLimiting: true,
        browserProfileIsolation: true,
      },
    };
  }

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async create(userId: string, dto: CreateCraftorDtoType) {
    const { rows } = await this.repo.create(userId, dto);
    await this.repo.auditCreated(userId, String(rows[0].id), dto.name);
    return rows[0];
  }

  async run(systemId: string, userId: string, dto: RunCraftorDtoType) {
    const { rows: systems } = await this.repo.getOwned(systemId, userId);
    const system = systems[0];
    if (!system) throw new NotFoundError('Craftor campaign');

    const v7Mode = resolveV7Mode(dto.mode);
    const metrics = (system.metrics ?? {}) as CraftorMetrics;
    this.assertReadiness(v7Mode, dto.mode, metrics);

    const niche = (metrics.niche ?? 'developer') as CraftorNiche;
    const platform = dto.platform ?? metrics.platforms?.[0] ?? 'upwork';
    const yield_ = await resolveCraftorYield({
      systemId,
      v7Mode,
      niche,
      platform,
      input: dto.input,
    });

    const leadsCollected = nonNegativeInt(metrics.leads_collected);
    const newLeads = leadsCollected + (yield_.leads ?? 0);
    const revenue = Math.round(yield_.revenue * (NICHE_REVENUE_MULTIPLIER[niche] ?? 1));
    const tax = calculateSofraTax({ grossRevenueEur: revenue, countryCode: 'EE' });

    let aiProposal: string[] | null = null;
    let humanizationNote: string | null = null;
    const ai = getAiClient();
    if (ai.isConfigured() && (v7Mode === 'proposal' || v7Mode === 'humanization')) {
      const rec = await ai.fetchRecommendations({
        mode: v7Mode,
        niche,
        platform,
        input: dto.input,
      });
      aiProposal = rec?.recommendations ?? null;
      if (v7Mode === 'humanization') {
        humanizationNote = 'AI humanization layer applied via aggregator';
      }
    }

    const jobScore = v7Mode === 'job-scoring' ? 0.82 : undefined;
    const conversionProbability =
      v7Mode === 'job-scoring' && jobScore !== undefined ? Number(jobScore.toFixed(3)) : undefined;

    const result = {
      mode: dto.mode,
      v7_mode: v7Mode,
      agent: dto.agent ?? this.defaultAgentForMode(v7Mode),
      platform,
      niche,
      communication_style: NICHE_COMMUNICATION_STYLE[niche],
      new_leads: yield_.leads ?? 0,
      estimated_revenue: revenue,
      proposals_generated: yield_.proposals ?? 0,
      jobs_scored: yield_.jobsScored ?? 0,
      deals_closed: yield_.deals ?? 0,
      memory_entries: yield_.memoryEntries ?? 0,
      humanization_delay_ms: yield_.humanizationDelayMs,
      job_score: jobScore,
      conversion_probability: conversionProbability,
      delivery_source: yield_.delivery_source,
      scrape_preview: yield_.scrape_preview ?? null,
      artifact_uri: yield_.artifact_uri ?? null,
      anti_detection: {
        level: metrics.anti_detection_level ?? 'medium',
        score: metrics.anti_detection_score ?? 85,
        proxy_rotation: true,
        session_isolated: true,
      },
      workflow_stage: yield_.workflowStage,
      sofra_tax: tax,
      ai_proposal_lines: aiProposal,
      humanization_note: humanizationNote,
    };

    const inputPayload = { mode: dto.mode, v7_mode: v7Mode, input: dto.input, platform: dto.platform, agent: dto.agent };
    const outputPayload = { mode: dto.mode, v7_mode: v7Mode, result };

    const { rows: runRows } = await this.repo.insertRun(
      systemId,
      `craftor_${dto.mode}`,
      inputPayload,
      outputPayload
    );

    const extraMetrics: Record<string, unknown> = {
      workflow_stage: yield_.workflowStage,
      proposals_sent: nonNegativeInt(metrics.proposals_sent) + (yield_.proposals ?? 0),
      jobs_scored: nonNegativeInt(metrics.jobs_scored) + (yield_.jobsScored ?? 0),
      deals_closed: nonNegativeInt(metrics.deals_closed) + (yield_.deals ?? 0),
      agent_memory_entries: nonNegativeInt(metrics.agent_memory_entries) + (yield_.memoryEntries ?? 0),
    };
    if (conversionProbability !== undefined) {
      extraMetrics.conversion_probability_avg = conversionProbability;
    }

    await this.repo.updateAfterRun(
      systemId,
      revenue,
      dto.mode,
      yield_.leads ?? 0,
      newLeads,
      extraMetrics
    );
    await this.repo.auditRunCompleted(userId, String(runRows[0].id), {
      mode: dto.mode,
      v7_mode: v7Mode,
      systemId,
    });

    return runRows[0];
  }

  private defaultAgentForMode(mode: CraftorV7Mode): string {
    const map: Record<CraftorV7Mode, string> = {
      hunting: 'outreach',
      'job-scoring': 'analytics',
      proposal: 'proposal',
      humanization: 'outreach',
      outreach: 'outreach',
      negotiation: 'negotiation',
      'reply-analysis': 'memory',
      analytics: 'analytics',
      ranking: 'ranking',
      'memory-sync': 'memory',
    };
    return map[mode];
  }

  private assertReadiness(v7Mode: CraftorV7Mode, requestedMode: CraftorRunModeType, metrics: CraftorMetrics): void {
    const leads = nonNegativeInt(metrics.leads_collected);
    const proposals = nonNegativeInt(metrics.proposals_sent);
    const jobsScored = nonNegativeInt(metrics.jobs_scored);

    if ((v7Mode === 'negotiation' || requestedMode === 'deal-close') && leads < 10) {
      throw new ValidationError(
        "Mode 'negotiation' (or legacy 'deal-close') requires minimum readiness of 10 collected leads"
      );
    }
    if (v7Mode === 'analytics' && proposals < 3) {
      throw new ValidationError("Mode 'analytics' requires at least 3 proposals sent");
    }
    if (v7Mode === 'ranking' && jobsScored < 5) {
      throw new ValidationError("Mode 'ranking' requires at least 5 scored jobs");
    }
    if (v7Mode === 'memory-sync' && leads < 1) {
      throw new ValidationError("Mode 'memory-sync' requires at least 1 collected lead");
    }
  }
}

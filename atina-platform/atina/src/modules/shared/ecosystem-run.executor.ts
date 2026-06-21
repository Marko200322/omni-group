import { config } from '../../config';
import { ApexPredatorService } from '../apex-predator/service/apex-predator.service';
import { ClientHunterService } from '../client-hunter/service/client-hunter.service';
import { CraftorService } from '../craftor/service/craftor.service';
import { Dominus360Service } from '../dominus360/service/dominus360.service';
import { FollowUpAutomationService } from '../follow-up-automation/service/follow-up-automation.service';
import { ForgeService } from '../forge/service/forge.service';
import { LeadScoringService } from '../lead-scoring/service/lead-scoring.service';
import { OutreachService } from '../outreach/service/outreach.service';
import { ProxyRotationService } from '../proxy-rotation/service/proxy-rotation.service';
import { TitanMasterService } from '../titan-master/service/titan-master.service';
import { TitanisService } from '../titanis/service/titanis.service';

export type EcosystemRunParams = {
  userId: string;
  moduleSlug: string;
  systemId: string;
  action: string;
  cfg: Record<string, unknown>;
  chainId: string;
};

const FORGE_ACTION_TO_MODE: Record<string, 'smelt' | 'temper' | 'deploy'> = {
  'connectivity-sync': 'smelt',
  'resilience-trigger': 'temper',
  'offer-acceleration': 'deploy',
  'policy-alignment': 'temper',
};

const CRAFTOR_ACTION_TO_MODE: Record<string, string> = {
  hunting: 'hunting',
  outreach: 'outreach',
  proposal: 'proposal',
};

const HUNTING_SLUGS = new Set([
  'client-hunter',
  'craftor',
  'forge',
  'titan-master',
  'apex-predator',
  'dominus360',
  'lead-scoring',
  'outreach',
  'titanis',
  'follow-up-automation',
  'proxy-rotation',
]);

function resolveOutreachMode(action: string): 'send' | 'sequence' | 'ab-test' {
  if (action === 'send' || action === 'sequence' || action === 'ab-test') return action;
  return action === 'run' ? 'sequence' : 'send';
}

function resolveLeadScoringMode(action: string): 'score' | 'rank' | 'refresh' {
  if (action === 'score' || action === 'rank' || action === 'refresh') return action;
  return 'score';
}

function resolveFollowUpMode(action: string): 'schedule' | 'escalate' | 'digest' {
  if (action === 'schedule' || action === 'escalate' || action === 'digest') return action;
  return action === 'sequence' ? 'schedule' : 'schedule';
}

function resolveProxyMode(action: string): 'rotate' | 'health' | 'register-pool' {
  if (action === 'rotate' || action === 'health' || action === 'register-pool') return action;
  return 'rotate';
}

function resolveTitanisMode(action: string): 'lead-hunt' | 'follow-up' | 'close' {
  if (action === 'lead-hunt' || action === 'follow-up' || action === 'close') return action;
  return 'lead-hunt';
}

function resolveClientHunterMode(action: string): 'discover' | 'hunt' | 'nurture' {
  if (action === 'discover' || action === 'hunt' || action === 'nurture') return action;
  return 'hunt';
}

export class EcosystemRunExecutor {
  private readonly clientHunter = new ClientHunterService();
  private readonly craftor = new CraftorService();
  private readonly forge = new ForgeService();
  private readonly titanMaster = new TitanMasterService();
  private readonly apex = new ApexPredatorService();
  private readonly dominus = new Dominus360Service();
  private readonly leadScoring = new LeadScoringService();
  private readonly outreach = new OutreachService();
  private readonly titanis = new TitanisService();
  private readonly followUpAutomation = new FollowUpAutomationService();
  private readonly proxyRotation = new ProxyRotationService();

  isRealExecutionEnabled(): boolean {
    return config.autonomy.realEcosystemRuns;
  }

  supports(moduleSlug: string): boolean {
    return HUNTING_SLUGS.has(moduleSlug);
  }

  async execute(params: EcosystemRunParams): Promise<Record<string, unknown>> {
    const { userId, moduleSlug, systemId, action, cfg } = params;
    const intensity = Number(cfg.intensity ?? 50);
    const revenueEstimate = Number(cfg.revenueEstimate ?? 50);

    if (moduleSlug === 'client-hunter') {
      const row = await this.clientHunter.run(systemId, userId, {
        mode: resolveClientHunterMode(action),
        intensity,
        revenueEstimate,
        verticalSlug: typeof cfg.verticalSlug === 'string' ? cfg.verticalSlug : undefined,
        category: typeof cfg.category === 'string' ? cfg.category : undefined,
        verticalName: typeof cfg.verticalName === 'string' ? cfg.verticalName : undefined,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'lead-scoring') {
      const row = await this.leadScoring.run(systemId, userId, {
        mode: resolveLeadScoringMode(action),
        intensity,
        revenueEstimate,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'outreach') {
      const row = await this.outreach.run(systemId, userId, {
        mode: resolveOutreachMode(action),
        intensity,
        revenueEstimate,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'titanis') {
      const row = await this.titanis.run(systemId, userId, {
        mode: resolveTitanisMode(action),
        targetCount: Number(cfg.targetCount ?? 25),
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'follow-up-automation') {
      const row = await this.followUpAutomation.run(systemId, userId, {
        mode: resolveFollowUpMode(action),
        intensity,
        revenueEstimate,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'proxy-rotation') {
      const row = await this.proxyRotation.run(systemId, userId, {
        mode: resolveProxyMode(action),
        intensity,
        revenueEstimate,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'craftor') {
      const mode = CRAFTOR_ACTION_TO_MODE[action] ?? 'hunting';
      const row = await this.craftor.run(systemId, userId, {
        mode: mode as 'hunting',
        input: (cfg.input as Record<string, unknown>) ?? {},
        platform: typeof cfg.platform === 'string' ? (cfg.platform as 'upwork') : undefined,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'forge') {
      const mode = FORGE_ACTION_TO_MODE[action] ?? 'smelt';
      const row = await this.forge.run(systemId, userId, {
        mode,
        intensity,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'titan-master') {
      const mode = action === 'expand' ? 'expand' : action === 'stabilize' ? 'stabilize' : 'optimize';
      const row = await this.titanMaster.run(systemId, userId, {
        mode: mode as 'expand' | 'optimize' | 'stabilize',
        input: (cfg.input as Record<string, unknown>) ?? { chainId: params.chainId },
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'apex-predator') {
      const mode =
        action === 'upsell'
          ? 'upsell'
          : action === 'retention'
            ? 'retention'
            : action === 'risk-shield'
              ? 'risk-shield'
              : 'outreach';
      const row = await this.apex.run(systemId, userId, {
        mode: mode as 'outreach' | 'upsell' | 'retention' | 'risk-shield',
        intensity,
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'dominus360') {
      const mode =
        action === 'forecast'
          ? 'forecast'
          : action === 'resource-allocation'
            ? 'resource-allocation'
            : 'risk-scan';
      const row = await this.dominus.run(systemId, userId, {
        mode: mode as 'forecast' | 'resource-allocation' | 'risk-scan',
        input: (cfg.input as Record<string, unknown>) ?? {},
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    return { executed: false, delivery: 'unsupported', moduleSlug, action };
  }
}

let defaultExecutor: EcosystemRunExecutor | undefined;

export function getEcosystemRunExecutor(): EcosystemRunExecutor {
  if (!defaultExecutor) defaultExecutor = new EcosystemRunExecutor();
  return defaultExecutor;
}

export function resetEcosystemRunExecutorForTests(): void {
  defaultExecutor = undefined;
}

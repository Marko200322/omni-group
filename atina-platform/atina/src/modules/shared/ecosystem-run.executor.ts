import { config } from '../../config';
import { ApexPredatorService } from '../apex-predator/service/apex-predator.service';
import { ClientHunterService } from '../client-hunter/service/client-hunter.service';
import { CraftorService } from '../craftor/service/craftor.service';
import { Dominus360Service } from '../dominus360/service/dominus360.service';
import { ForgeService } from '../forge/service/forge.service';
import { TitanMasterService } from '../titan-master/service/titan-master.service';

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

export class EcosystemRunExecutor {
  private readonly clientHunter = new ClientHunterService();
  private readonly craftor = new CraftorService();
  private readonly forge = new ForgeService();
  private readonly titanMaster = new TitanMasterService();
  private readonly apex = new ApexPredatorService();
  private readonly dominus = new Dominus360Service();

  isRealExecutionEnabled(): boolean {
    return config.autonomy.realEcosystemRuns;
  }

  supports(moduleSlug: string): boolean {
    return [
      'client-hunter',
      'craftor',
      'forge',
      'titan-master',
      'apex-predator',
      'dominus360',
    ].includes(moduleSlug);
  }

  async execute(params: EcosystemRunParams): Promise<Record<string, unknown>> {
    const { userId, moduleSlug, systemId, action, cfg, chainId } = params;

    if (moduleSlug === 'client-hunter') {
      const mode = action === 'discover' ? 'discover' : action === 'hunt' ? 'hunt' : 'nurture';
      const row = await this.clientHunter.run(systemId, userId, {
        mode: mode as 'discover' | 'hunt' | 'nurture',
        intensity: Number(cfg.intensity ?? 50),
        revenueEstimate: Number(cfg.revenueEstimate ?? 50),
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
        intensity: Number(cfg.intensity ?? 25),
      });
      return { executed: true, delivery: 'real', moduleSlug, result: row };
    }

    if (moduleSlug === 'titan-master') {
      const mode = action === 'expand' ? 'expand' : action === 'stabilize' ? 'stabilize' : 'optimize';
      const row = await this.titanMaster.run(systemId, userId, {
        mode: mode as 'expand' | 'optimize' | 'stabilize',
        input: (cfg.input as Record<string, unknown>) ?? { chainId },
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
        intensity: Number(cfg.intensity ?? 50),
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

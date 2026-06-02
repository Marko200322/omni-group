import { config } from '../../../config';
import { getAiClient } from '../../../integrations';
import { NotFoundError } from '../../../utils/errors';
import type {
  AutonomyCycleStep,
  DeployVerticalDtoType,
  GenerateVerticalDtoType,
  ResearchVerticalDtoType,
  TickAutonomyDtoType,
} from '../dto/autonomy-loop.dto';
import { INDUSTRY_SEED_COUNT } from '../data/industry-seed';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { DeployPipelineService } from './deploy-pipeline.service';
import { IndustryRegistryService } from './industry-registry.service';
import { MarketResearchService } from './market-research.service';
import { ModuleGeneratorService } from './module-generator.service';
import { RevenueFeedbackService } from './revenue-feedback.service';

export type ClosedLoopResult = {
  cycleId: string;
  verticalSlug: string;
  steps: AutonomyCycleStep[];
  success: boolean;
};

export class AutonomyOrchestratorService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly registry = new IndustryRegistryService();
  private readonly research = new MarketResearchService();
  private readonly generator = new ModuleGeneratorService();
  private readonly deploy = new DeployPipelineService();
  private readonly feedback = new RevenueFeedbackService();
  private readonly ai = getAiClient();

  async runClosedLoopForVertical(
    userId: string | null,
    slug: string,
    opts?: { runDeploy?: boolean }
  ): Promise<ClosedLoopResult> {
    const actorUserId = userId ?? undefined;
    const { rows: cycleRows } = await this.repo.createCycle(userId, 'closed_loop', slug);
    const cycleId = cycleRows[0]?.id as string;
    const steps: AutonomyCycleStep[] = [];
    let success = true;

    try {
      const vertical = await this.registry.getBySlug(slug);
      if (!vertical) throw new NotFoundError('Industry vertical');

      try {
        const researchDto: ResearchVerticalDtoType = { intensity: 55 };
        const researchResult = await this.research.research(slug, researchDto);
        steps.push({
          step: 'market_research',
          status: 'ok',
          detail: { tam: researchResult.research.tam_estimate_usd },
        });
      } catch (err) {
        success = false;
        steps.push({
          step: 'market_research',
          status: 'failed',
          detail: { error: err instanceof Error ? err.message : String(err) },
        });
      }

      try {
        const genDto: GenerateVerticalDtoType = { includePage: true, includeWorkflow: true };
        const genResult = await this.generator.generate(slug, genDto);
        steps.push({
          step: 'module_generate',
          status: 'ok',
          detail: { artifacts: genResult.artifacts.length, outputDir: genResult.outputDir },
        });
      } catch (err) {
        success = false;
        steps.push({
          step: 'module_generate',
          status: 'failed',
          detail: { error: err instanceof Error ? err.message : String(err) },
        });
      }

      const shouldDeploy = opts?.runDeploy ?? config.autonomy.autoDeploy;
      if (shouldDeploy) {
        try {
          const deployDto: DeployVerticalDtoType = {
            gitCommit: Boolean(config.autonomy.gitRepoPath),
            triggerCi: true,
            notes: `Autonomy closed loop — ${slug}`,
          };
          const deployResult = await this.deploy.deploy(slug, deployDto, userId ?? undefined);
          steps.push({
            step: 'deploy',
            status: deployResult.status === 'failed' ? 'failed' : 'ok',
            detail: deployResult as Record<string, unknown>,
          });
          if (deployResult.status === 'failed') success = false;
        } catch (err) {
          success = false;
          steps.push({
            step: 'deploy',
            status: 'failed',
            detail: { error: err instanceof Error ? err.message : String(err) },
          });
        }
      } else {
        steps.push({ step: 'deploy', status: 'skipped', detail: { reason: 'auto_deploy_disabled' } });
      }

      if (userId) {
        try {
          const fb = await this.feedback.sync(userId, { lookbackDays: 30 });
          steps.push({
            step: 'revenue_feedback',
            status: 'ok',
            detail: { verticalsUpdated: fb.verticalsUpdated },
          });
        } catch (err) {
          steps.push({
            step: 'revenue_feedback',
            status: 'failed',
            detail: { error: err instanceof Error ? err.message : String(err) },
          });
        }
      } else {
        steps.push({ step: 'revenue_feedback', status: 'skipped', detail: { reason: 'no_actor_user' } });
      }

      if (this.ai.isConfigured()) {
        void this.ai
          .remember({
            namespace: 'autonomy-loop',
            key: slug,
            value: { steps, success, finishedAt: new Date().toISOString() },
            userId: actorUserId,
          })
          .catch(() => undefined);
        steps.push({ step: 'ai_learn', status: 'ok' });
      } else {
        steps.push({ step: 'ai_learn', status: 'skipped', detail: { reason: 'ai_not_configured' } });
      }

      await this.repo.finishCycle(cycleId, success ? 'completed' : 'partial', steps, {
        verticalSlug: slug,
        success,
      });
    } catch (err) {
      await this.repo.finishCycle(
        cycleId,
        'failed',
        steps,
        { verticalSlug: slug },
        err instanceof Error ? err.message : String(err)
      );
      throw err;
    }

    return { cycleId, verticalSlug: slug, steps, success };
  }

  async tick(userId: string | null, dto: TickAutonomyDtoType) {
    const countResult = await this.repo.countVerticals();
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    if (total === 0) {
      await this.registry.seedAll();
    }

    const max = dto.maxVerticals ?? config.autonomy.maxVerticalsPerTick;
    const { rows: picks } = await this.repo.pickVerticalsForCycle(max);
    const results: ClosedLoopResult[] = [];

    for (const vertical of picks) {
      const result = await this.runClosedLoopForVertical(userId, vertical.slug, {
        runDeploy: dto.runDeploy,
      });
      results.push(result);
    }

    await this.feedback.boostActiveVerticals(userId);

    return {
      processed: results.length,
      results,
      seedCatalogSize: INDUSTRY_SEED_COUNT,
    };
  }

  /** Called from Titan Master expand mode. */
  async expandFromTitanMaster(userId: string, objective?: Record<string, unknown>) {
    const max = typeof objective?.maxVerticals === 'number' ? objective.maxVerticals : 2;
    return this.tick(userId, { maxVerticals: Math.min(10, max), runDeploy: config.autonomy.autoDeploy });
  }
}

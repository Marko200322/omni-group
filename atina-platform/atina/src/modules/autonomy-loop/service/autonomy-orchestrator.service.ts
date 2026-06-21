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
import {
  AutonomyBudgetService,
  createTickSpendTracker,
  type TickSpendTracker,
} from './autonomy-budget.service';
import { AutonomyMarketingService } from './autonomy-marketing.service';
import { AutonomyNotifierService } from './autonomy-notifier.service';
import { CategoryRolloutJobService } from './category-rollout-job.service';
import { DeployPipelineService } from './deploy-pipeline.service';
import { IndustryRegistryService } from './industry-registry.service';
import { MarketResearchService } from './market-research.service';
import { ModuleGeneratorService } from './module-generator.service';
import { RevenueFeedbackService } from './revenue-feedback.service';
import { PlatformEvolutionTickService } from './platform-evolution-tick.service';
import { ProductFactoryInternalService } from '../../product-factory/service/product-factory-internal.service';
import logger from '../../../utils/logger';

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
  private readonly budget = new AutonomyBudgetService();
  private readonly marketing = new AutonomyMarketingService();
  private readonly notifier = new AutonomyNotifierService();
  private readonly categoryRolloutJob = new CategoryRolloutJobService();
  private readonly ai = getAiClient();
  private readonly evolutionTick = new PlatformEvolutionTickService();
  private readonly productFactoryInternal = new ProductFactoryInternalService();

  private async runProductFactoryInternalSafe(userId: string | null) {
    if (!userId || !config.productFactory.enabled || !config.productFactory.internalLaneEnabled) {
      return { processed: 0, results: [], skipped: true as const, reason: 'product_factory_internal_disabled' };
    }
    try {
      return await this.productFactoryInternal.tick(userId, config.productFactory.maxInternalPerTick);
    } catch {
      return { processed: 0, results: [], skipped: true as const, reason: 'product_factory_internal_unavailable' };
    }
  }

  private async runEvolutionSafe(userId: string | null) {
    try {
      return await this.evolutionTick.tick(userId);
    } catch {
      return { processed: 0, results: [], skipped: true as const, reason: 'evolution_unavailable' };
    }
  }

  async runClosedLoopForVertical(
    userId: string | null,
    slug: string,
    opts?: { runDeploy?: boolean; tickTracker?: TickSpendTracker }
  ): Promise<ClosedLoopResult> {
    const actorUserId = userId ?? undefined;
    const tracker = opts?.tickTracker ?? createTickSpendTracker();
    const { rows: cycleRows } = await this.repo.createCycle(userId, 'closed_loop', slug);
    const cycleId = cycleRows[0]?.id as string;
    const steps: AutonomyCycleStep[] = [];
    let success = true;

    try {
      const vertical = await this.registry.getBySlug(slug);
      if (!vertical) throw new NotFoundError('Industry vertical');

      const priorityScore = parseFloat(String(vertical.priority_score ?? 0));

      const researchSpend = await this.budget.spend(
        'market_research',
        config.autonomy.budget.costs.research,
        tracker,
        { verticalSlug: slug, metadata: { via: 'aggregator_scrape_ai' } }
      );
      if (researchSpend.ok) {
        try {
          const researchDto: ResearchVerticalDtoType = { intensity: 55 };
          const researchResult = await this.research.research(slug, researchDto);
          steps.push({
            step: 'market_research',
            status: 'ok',
            detail: {
              tam: researchResult.research.tam_estimate_usd,
              spentUsd: researchSpend.amountUsd,
            },
          });

          const marketingSpend = await this.budget.spend(
            'marketing',
            config.autonomy.budget.costs.marketing,
            tracker,
            { verticalSlug: slug, metadata: { channel: 'business_dev' } }
          );
          if (marketingSpend.ok) {
            const mkt = await this.marketing.spendForVertical(
              slug,
              String(vertical.category),
              marketingSpend.amountUsd,
              priorityScore
            );
            steps.push({
              step: 'marketing_spend',
              status: mkt.ok ? 'ok' : 'skipped',
              detail: mkt as Record<string, unknown>,
            });
          } else {
            steps.push({
              step: 'marketing_spend',
              status: 'skipped',
              detail: { reason: marketingSpend.reason },
            });
          }
        } catch (err) {
          success = false;
          steps.push({
            step: 'market_research',
            status: 'failed',
            detail: { error: err instanceof Error ? err.message : String(err) },
          });
        }
      } else {
        steps.push({
          step: 'market_research',
          status: 'skipped',
          detail: { reason: researchSpend.reason, budgetGuard: true },
        });
      }

      const generateSpend = await this.budget.spend(
        'module_generate',
        config.autonomy.budget.costs.generate,
        tracker,
        { verticalSlug: slug }
      );
      if (generateSpend.ok) {
        try {
          const genDto: GenerateVerticalDtoType = {
            includePage: true,
            includeWorkflow: true,
            includeOutreach: true,
            includeQualityPack: true,
            includeDeliverablePack: true,
            queueOutbound: true,
          };
          const genResult = await this.generator.generate(slug, genDto, userId);
          steps.push({
            step: 'module_generate',
            status: 'ok',
            detail: {
              artifacts: genResult.artifacts.length,
              outputDir: genResult.outputDir,
              outboundDraftId: genResult.outboundDraft?.id ?? null,
            },
          });
        } catch (err) {
          success = false;
          steps.push({
            step: 'module_generate',
            status: 'failed',
            detail: { error: err instanceof Error ? err.message : String(err) },
          });
        }
      } else {
        steps.push({
          step: 'module_generate',
          status: 'skipped',
          detail: { reason: generateSpend.reason, budgetGuard: true },
        });
      }

      const shouldDeploy = opts?.runDeploy ?? config.autonomy.autoDeploy;
      if (shouldDeploy) {
        const deploySpend = await this.budget.spend(
          'deploy',
          config.autonomy.budget.costs.deploy,
          tracker,
          { verticalSlug: slug, metadata: { git: Boolean(config.autonomy.gitRepoPath) } }
        );
        if (deploySpend.ok) {
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
          steps.push({
            step: 'deploy',
            status: 'skipped',
            detail: { reason: deploySpend.reason, budgetGuard: true },
          });
        }
      } else {
        steps.push({ step: 'deploy', status: 'skipped', detail: { reason: 'auto_deploy_disabled' } });
      }

      if (userId) {
        try {
          const fb = await this.feedback.sync(userId, { lookbackDays: 30 });
          for (const row of fb.updates) {
            const rev = typeof row.revenueApplied === 'number' ? row.revenueApplied : 0;
            if (rev > 0 && typeof row.slug === 'string') {
              await this.budget.creditRevenue(rev, 'payment_reinvest', { verticalSlug: row.slug });
            }
          }
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

      const learnSpend = await this.budget.spend(
        'ai_learn',
        config.autonomy.budget.costs.aiLearn,
        tracker,
        { verticalSlug: slug }
      );
      if (learnSpend.ok && this.ai.isConfigured()) {
        void this.ai
          .remember({
            namespace: 'autonomy-loop',
            key: slug,
            value: { steps, success, finishedAt: new Date().toISOString() },
            userId: actorUserId,
          })
          .catch(() => undefined);
        steps.push({ step: 'ai_learn', status: 'ok' });
      } else if (!learnSpend.ok) {
        steps.push({
          step: 'ai_learn',
          status: 'skipped',
          detail: { reason: learnSpend.reason, budgetGuard: true },
        });
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
    const gate = await this.budget.canOperate();
    if (!gate.ok) {
      await this.notifier.notify({
        title: 'Autonomy pauziran',
        message: `Razlog: ${gate.reason}. Stanje: $${gate.status.balanceUsd.toFixed(2)} (rezerva $${gate.status.minReserveUsd}).`,
        severity: 'warning',
        userId,
        metadata: gate.status as unknown as Record<string, unknown>,
      });
      return {
        processed: 0,
        results: [],
        seedCatalogSize: INDUSTRY_SEED_COUNT,
        budget: gate.status,
        paused: true,
        pauseReason: gate.reason,
      };
    }

    const countResult = await this.repo.countVerticals();
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    if (total === 0) {
      await this.registry.seedAll();
    }

    if (config.autonomy.categoryRolloutEnabled) {
      const active = this.categoryRolloutJob.getActiveJob();
      if (active?.status === 'running') {
        const budget = await this.budget.getStatus();
        return {
          processed: 0,
          results: [],
          seedCatalogSize: INDUSTRY_SEED_COUNT,
          budget,
          categoryRollout: { skipped: true, reason: 'job_already_running', jobId: active.id },
        };
      }

      const job = this.categoryRolloutJob.startJob(userId, {
        mode: 'full',
        limit: config.autonomy.categoryRolloutBatchSize,
        maxCategories: config.autonomy.categoryRolloutMaxCategoriesPerTick,
        processAllVerticals: true,
      });
      const budget = await this.budget.getStatus();
      const evolution = await this.runEvolutionSafe(userId);
      const productFactoryInternal = await this.runProductFactoryInternalSafe(userId);
      return {
        processed: 0,
        results: [],
        seedCatalogSize: INDUSTRY_SEED_COUNT,
        budget,
        categoryRollout: { asyncJobStarted: true, jobId: job.id, status: job.status },
        platformEvolution: evolution,
        productFactoryInternal,
      };
    }

    const max = dto.maxVerticals ?? config.autonomy.maxVerticalsPerTick;
    const { rows: picks } = await this.repo.pickVerticalsForCycle(max);
    const results: ClosedLoopResult[] = [];
    const tickTracker = createTickSpendTracker();

    for (const vertical of picks) {
      const result = await this.runClosedLoopForVertical(userId, vertical.slug, {
        runDeploy: dto.runDeploy,
        tickTracker,
      });
      results.push(result);
    }

    await this.feedback.boostActiveVerticals(userId);
    const budget = await this.budget.getStatus();

    const okCount = results.filter((r) => r.success).length;
    await this.notifier.notify({
      title: 'Autonomy tick završen',
      message: [
        `Vertikala: ${results.length}, uspeh: ${okCount}`,
        `Potrošeno u tick-u: $${tickTracker.spentUsd.toFixed(2)}`,
        `Budžet: $${budget.balanceUsd.toFixed(2)} / $${budget.initialUsd.toFixed(2)}`,
        `Danas potrošeno: $${budget.spentTodayUsd.toFixed(2)} / $${budget.maxSpendPerDayUsd}`,
      ].join('\n'),
      severity: okCount === results.length ? 'info' : 'warning',
      userId,
      metadata: { tickSpentUsd: tickTracker.spentUsd, budget },
    });

    const platformEvolution = await this.runEvolutionSafe(userId);
    const productFactoryInternal = await this.runProductFactoryInternalSafe(userId);

    void import('../../resource-procurement/service/resource-procurement.service')
      .then(({ ResourceProcurementService }) => new ResourceProcurementService().runAutoProcurement(userId))
      .catch((err) => logger.warn('Auto resource procurement check failed', { error: String(err) }));

    return {
      processed: results.length,
      results,
      seedCatalogSize: INDUSTRY_SEED_COUNT,
      budget,
      tickSpentUsd: tickTracker.spentUsd,
      platformEvolution,
      productFactoryInternal,
    };
  }

  /** Called from Titan Master expand mode. */
  async expandFromTitanMaster(userId: string, objective?: Record<string, unknown>) {
    const max = typeof objective?.maxVerticals === 'number' ? objective.maxVerticals : 2;
    return this.tick(userId, { maxVerticals: Math.min(10, max), runDeploy: config.autonomy.autoDeploy });
  }
}

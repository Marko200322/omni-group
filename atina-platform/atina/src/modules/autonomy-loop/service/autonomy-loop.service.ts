import { config } from '../../../config';
import { NotFoundError } from '../../../utils/errors';
import { INDUSTRY_SEED_COUNT } from '../data/industry-seed';
import type {
  CategoryBatchDtoType,
  CategoryRolloutDtoType,
  DeployVerticalDtoType,
  FeedbackSyncDtoType,
  GenerateVerticalDtoType,
  ListVerticalsQueryDtoType,
  ResearchVerticalDtoType,
  TickAutonomyDtoType,
} from '../dto/autonomy-loop.dto';
import { resolveVerticalDeliveryPack } from '../lib/vertical-delivery-resolver';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { AutonomyOrchestratorService } from './autonomy-orchestrator.service';
import { AutonomyBudgetService } from './autonomy-budget.service';
import { CategoryBatchService } from './category-batch.service';
import { CategoryRolloutService } from './category-rollout.service';
import { CategoryRolloutJobService } from './category-rollout-job.service';
import { DeployPipelineService } from './deploy-pipeline.service';
import { IndustryRegistryService } from './industry-registry.service';
import { MarketResearchService } from './market-research.service';
import { ModuleGeneratorService } from './module-generator.service';
import { OutboundQueueService } from './outbound-queue.service';
import { RevenueFeedbackService } from './revenue-feedback.service';
import { PlatformEvolutionTickService } from './platform-evolution-tick.service';
import { PlatformEvolutionService } from './platform-evolution.service';

let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
let lastTickAt: string | null = null;

export class AutonomyLoopService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly registry = new IndustryRegistryService();
  private readonly research = new MarketResearchService();
  private readonly generator = new ModuleGeneratorService();
  private readonly deploy = new DeployPipelineService();
  private readonly feedback = new RevenueFeedbackService();
  private readonly orchestrator = new AutonomyOrchestratorService();
  private readonly budget = new AutonomyBudgetService();
  private readonly categoryBatch = new CategoryBatchService();
  private readonly categoryRollout = new CategoryRolloutService();
  private readonly categoryRolloutJob = new CategoryRolloutJobService();
  private readonly outbound = new OutboundQueueService();
  private readonly evolutionTick = new PlatformEvolutionTickService();
  private readonly evolution = new PlatformEvolutionService();

  getSchedulerState() {
    return {
      enabled: config.autonomy.enabled,
      running: schedulerRunning,
      intervalMs: config.autonomy.tickIntervalMs,
      lastTickAt,
      autoDeploy: config.autonomy.autoDeploy,
      realEcosystemRuns: config.autonomy.realEcosystemRuns,
    };
  }

  startScheduler(systemUserId: string | null) {
    if (schedulerInterval) clearInterval(schedulerInterval);
    schedulerRunning = true;
    schedulerInterval = setInterval(() => {
      void this.orchestrator
        .tick(systemUserId, { maxVerticals: config.autonomy.maxVerticalsPerTick })
        .then(() => {
          lastTickAt = new Date().toISOString();
        })
        .catch(() => undefined);
    }, config.autonomy.tickIntervalMs);
    return this.getSchedulerState();
  }

  stopScheduler() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    schedulerRunning = false;
    return this.getSchedulerState();
  }

  async status() {
    const [countResult, latestCycle, artifactsCount, budget] = await Promise.all([
      this.repo.countVerticals(),
      this.repo.getLatestCycle(),
      this.repo.listVerticals(1, 0),
      this.budget.getStatus().catch(() => null),
    ]);
    return {
      seedCatalogSize: INDUSTRY_SEED_COUNT,
      verticalsInDb: parseInt(countResult.rows[0]?.count ?? '0', 10),
      scheduler: this.getSchedulerState(),
      latestCycle: latestCycle.rows[0] ?? null,
      budget,
      config: {
        generatedDir: config.autonomy.generatedDir,
        gitRepoPath: config.autonomy.gitRepoPath || null,
        maxVerticalsPerTick: config.autonomy.maxVerticalsPerTick,
        categoryRolloutEnabled: config.autonomy.categoryRolloutEnabled,
        categoryRolloutMaxCategoriesPerTick: config.autonomy.categoryRolloutMaxCategoriesPerTick,
        categoryRolloutBatchSize: config.autonomy.categoryRolloutBatchSize,
        marketingEnabled: config.autonomy.budget.marketingEnabled,
        telegramConfigured: Boolean(
          config.autonomy.telegram.chatId &&
            (config.autonomy.telegram.botToken || config.aggregators.comms.url)
        ),
      },
      registrySample: artifactsCount.rows[0] ?? null,
    };
  }

  budgetStatus() {
    return this.budget.getStatus();
  }

  seedVerticals() {
    return this.registry.seedAll();
  }

  listVerticals(query: ListVerticalsQueryDtoType) {
    return this.registry.list(query);
  }

  getVertical(slug: string) {
    return this.registry.getBySlug(slug);
  }

  async getVerticalDeliveryPack(slug: string) {
    const vertical = await this.registry.getBySlug(slug);
    if (!vertical) throw new NotFoundError('Industry vertical');
    const research = (vertical.research_data ?? {}) as Record<string, unknown>;
    return resolveVerticalDeliveryPack({
      slug,
      category: String(vertical.category),
      name: String(vertical.name),
      researchData: research,
    });
  }

  researchVertical(slug: string, dto: ResearchVerticalDtoType) {
    return this.research.research(slug, dto);
  }

  generateVertical(slug: string, dto: GenerateVerticalDtoType, userId?: string | null) {
    return this.generator.generate(slug, dto, userId);
  }

  processCategoryBatch(userId: string | null, category: string, dto: CategoryBatchDtoType) {
    if (dto.processAllVerticals) {
      return this.categoryRollout.processSingleCategory(
        userId,
        category,
        dto.mode,
        dto.limit,
        true
      );
    }
    return this.categoryBatch.processCategory(userId, category, dto.mode, dto.limit);
  }

  getCategoriesRolloutStatus() {
    return this.categoryRollout.getStatus();
  }

  processCategoriesRollout(userId: string | null, dto: CategoryRolloutDtoType) {
    return this.categoryRollout.processRollout(userId, dto);
  }

  startCategoriesRolloutJob(userId: string | null, dto: CategoryRolloutDtoType) {
    return this.categoryRolloutJob.startJob(userId, dto);
  }

  getCategoriesRolloutJob() {
    return {
      active: this.categoryRolloutJob.getActiveJob(),
      last: this.categoryRolloutJob.getLastJob(),
    };
  }

  outboundStats() {
    return this.outbound.getStats();
  }

  processOutboundSend() {
    return this.outbound.processSendQueue();
  }

  queueOutboundDrafts() {
    return this.outbound.queueDraftsForWarmupComplete();
  }

  deployVertical(slug: string, dto: DeployVerticalDtoType, userId: string) {
    return this.deploy.deploy(slug, dto, userId);
  }

  syncFeedback(userId: string, dto: FeedbackSyncDtoType) {
    return this.feedback.sync(userId, dto);
  }

  tick(userId: string, dto: TickAutonomyDtoType) {
    lastTickAt = new Date().toISOString();
    return this.orchestrator.tick(userId, dto);
  }

  expandFromTitanMaster(userId: string, objective?: Record<string, unknown>) {
    return this.orchestrator.expandFromTitanMaster(userId, objective);
  }

  runEvolutionTick(userId: string | null) {
    return this.evolutionTick.tick(userId);
  }

  listEvolutionTasks(limit = 50) {
    return this.evolution.listPending(limit);
  }
}

export function resetAutonomySchedulerForTests() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  schedulerInterval = null;
  schedulerRunning = false;
  lastTickAt = null;
}

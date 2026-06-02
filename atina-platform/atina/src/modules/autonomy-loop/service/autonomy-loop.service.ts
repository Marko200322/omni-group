import { config } from '../../../config';
import { INDUSTRY_SEED_COUNT } from '../data/industry-seed';
import type {
  DeployVerticalDtoType,
  FeedbackSyncDtoType,
  GenerateVerticalDtoType,
  ListVerticalsQueryDtoType,
  ResearchVerticalDtoType,
  TickAutonomyDtoType,
} from '../dto/autonomy-loop.dto';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { AutonomyOrchestratorService } from './autonomy-orchestrator.service';
import { DeployPipelineService } from './deploy-pipeline.service';
import { IndustryRegistryService } from './industry-registry.service';
import { MarketResearchService } from './market-research.service';
import { ModuleGeneratorService } from './module-generator.service';
import { RevenueFeedbackService } from './revenue-feedback.service';

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
    const [countResult, latestCycle, artifactsCount] = await Promise.all([
      this.repo.countVerticals(),
      this.repo.getLatestCycle(),
      this.repo.listVerticals(1, 0),
    ]);
    return {
      seedCatalogSize: INDUSTRY_SEED_COUNT,
      verticalsInDb: parseInt(countResult.rows[0]?.count ?? '0', 10),
      scheduler: this.getSchedulerState(),
      latestCycle: latestCycle.rows[0] ?? null,
      config: {
        generatedDir: config.autonomy.generatedDir,
        gitRepoPath: config.autonomy.gitRepoPath || null,
        maxVerticalsPerTick: config.autonomy.maxVerticalsPerTick,
      },
      registrySample: artifactsCount.rows[0] ?? null,
    };
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

  researchVertical(slug: string, dto: ResearchVerticalDtoType) {
    return this.research.research(slug, dto);
  }

  generateVertical(slug: string, dto: GenerateVerticalDtoType) {
    return this.generator.generate(slug, dto);
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
}

export function resetAutonomySchedulerForTests() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  schedulerInterval = null;
  schedulerRunning = false;
  lastTickAt = null;
}

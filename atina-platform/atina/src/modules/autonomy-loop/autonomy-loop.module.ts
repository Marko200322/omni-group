import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { config } from '../../config';
import logger from '../../utils/logger';
import { AutonomyLoopController } from './controller/autonomy-loop.controller';
import {
  CategoryBatchDto,
  CategoryParamDto,
  CategoryRolloutDto,
  DeployVerticalDto,
  FeedbackSyncDto,
  GenerateVerticalDto,
  ListVerticalsQueryDto,
  ResearchVerticalDto,
  TickAutonomyDto,
  VerticalSlugParamDto,
} from './dto/autonomy-loop.dto';
import { AutonomyLoopService } from './service/autonomy-loop.service';

export class AutonomyLoopModule implements IModule {
  name = 'Autonomy Loop';
  slug = 'autonomy-loop';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  readonly service = new AutonomyLoopService();
  private readonly controller: AutonomyLoopController;

  constructor() {
    this.router = Router();
    this.controller = new AutonomyLoopController(this.service);
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    if (config.autonomy.enabled && config.autonomy.autoStartScheduler) {
      logger.info('Autonomy Loop: starting background scheduler');
      this.service.startScheduler(null);
    }
  }

  async shutdown(): Promise<void> {
    this.service.stopScheduler();
  }

  private setupRoutes(): void {
    this.router.get(
      '/status',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.status
    );

    this.router.get(
      '/budget',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.budget
    );

    this.router.get(
      '/verticals',
      authenticate,
      validateQuery(ListVerticalsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listVerticals
    );

    this.router.get(
      '/verticals/:slug',
      authenticate,
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getVertical
    );

    this.router.get(
      '/verticals/:slug/delivery-pack',
      authenticate,
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getDeliveryPack
    );

    this.router.post(
      '/verticals/seed',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.seedVerticals
    );

    this.router.post(
      '/verticals/:slug/research',
      authenticate,
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ResearchVerticalDto),
      this.controller.research
    );

    this.router.post(
      '/verticals/:slug/generate',
      authenticate,
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(GenerateVerticalDto),
      this.controller.generate
    );

    this.router.post(
      '/categories/:category/batch',
      authenticate,
      requireAdmin,
      validateParams(CategoryParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(CategoryBatchDto),
      this.controller.processCategoryBatch
    );

    this.router.get(
      '/categories/status',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getCategoriesRolloutStatus
    );

    this.router.post(
      '/categories/rollout',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CategoryRolloutDto),
      this.controller.processCategoriesRollout
    );

    this.router.post(
      '/categories/rollout/async',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CategoryRolloutDto),
      this.controller.startCategoriesRolloutJob
    );

    this.router.get(
      '/categories/rollout/job',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getCategoriesRolloutJob
    );

    this.router.get(
      '/outbound/stats',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.outboundStats
    );

    this.router.post(
      '/outbound/process-send',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.processOutboundSend
    );

    this.router.post(
      '/verticals/:slug/deploy',
      authenticate,
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(DeployVerticalDto),
      this.controller.deploy
    );

    this.router.post(
      '/feedback/sync',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(FeedbackSyncDto),
      this.controller.syncFeedback
    );

    this.router.post(
      '/tick',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(TickAutonomyDto),
      this.controller.tick
    );

    this.router.get(
      '/evolution/tasks',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listEvolutionTasks
    );

    this.router.post(
      '/evolution/tick',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.runEvolutionTick
    );

    this.router.post(
      '/scheduler/start',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.startScheduler
    );

    this.router.post(
      '/scheduler/stop',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.stopScheduler
    );
  }
}

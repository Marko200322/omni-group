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

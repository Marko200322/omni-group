import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AnalyticsController } from './controller/analytics.controller';
import {
  AnalyticsDashboardQueryDto,
  AnalyticsEventsQueryDto,
  TrackEventDto,
} from './dto/analytics.dto';

export class AnalyticsModule implements IModule {
  name = 'Analytics';
  slug = 'analytics';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new AnalyticsController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.post(
      '/track',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(TrackEventDto),
      this.controller.track
    );
    this.router.get(
      '/dashboard',
      authenticate,
      validateQuery(AnalyticsDashboardQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.dashboard
    );
    this.router.get(
      '/admin/overview',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.adminOverview
    );
    this.router.get(
      '/events',
      authenticate,
      validateQuery(AnalyticsEventsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listEvents
    );
  }
}

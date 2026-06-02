import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { SubscriptionsController } from './controller/subscriptions.controller';
import { AdminSubscriptionsQueryDto } from './dto/subscriptions.dto';

export class SubscriptionsModule implements IModule {
  name = 'Subscriptions';
  slug = 'subscriptions';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new SubscriptionsController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/current',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.current
    );
    this.router.get(
      '/usage',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.usage
    );
    this.router.get(
      '/admin/all',
      authenticate,
      requireAdmin,
      validateQuery(AdminSubscriptionsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.adminAll
    );
  }
}

import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AlertSystemController } from './controller/alert-system.controller';
import {
  AlertIdParamsDto,
  AlertListQueryDto,
  CreateAlertDto,
} from './dto/alert-system.dto';

export class AlertSystemModule implements IModule {
  name = 'Alert System';
  slug = 'alert-system';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new AlertSystemController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(AlertListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/summary',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.summary
    );
    this.router.post(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateAlertDto),
      this.controller.create
    );
    this.router.patch(
      '/:id/acknowledge',
      authenticate,
      authSessionLimiter,
      validateParams(AlertIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.acknowledge
    );
    this.router.patch(
      '/:id/resolve',
      authenticate,
      authSessionLimiter,
      validateParams(AlertIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.resolve
    );
    this.router.get(
      '/admin/open',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listOpenAdmin
    );
  }
}

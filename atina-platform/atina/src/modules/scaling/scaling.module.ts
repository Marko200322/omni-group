import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ScalingController } from './controller/scaling.controller';
import { ScalingEvaluateDto, ScalingRegisterNodeDto } from './dto/scaling.dto';

export class ScalingModule implements IModule {
  name = 'Scaling';
  slug = 'scaling';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ScalingController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/nodes',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listNodes
    );
    this.router.post(
      '/nodes',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ScalingRegisterNodeDto),
      this.controller.registerNode
    );
    this.router.post(
      '/evaluate',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ScalingEvaluateDto),
      this.controller.evaluate
    );
  }
}

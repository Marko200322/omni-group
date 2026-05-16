import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { PhaseLaunchController } from './controller/phase-launch.controller';
import { SetPhaseDto } from './dto/phase-launch.dto';

export class PhaseLaunchModule implements IModule {
  name = 'Phase Launch';
  slug = 'phase-launch';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new PhaseLaunchController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.get
    );
    this.router.post('/', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(SetPhaseDto), this.controller.set);
  }
}

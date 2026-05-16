import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { OmniGameController } from './controller/omnigame.controller';
import { CreateOmniGameDto, OmniGameRunParamsDto, RunOmniGameDto } from './dto/omnigame.dto';

export class OmniGameModule implements IModule {
  name = 'OmniGame';
  slug = 'omnigame';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new OmniGameController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateOmniGameDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(OmniGameRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunOmniGameDto),
      this.controller.run
    );
  }
}

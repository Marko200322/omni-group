import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { OmniTubeController } from './controller/omnitube.controller';
import { CreateOmniTubeDto, OmniTubeRunParamsDto, RunOmniTubeDto } from './dto/omnitube.dto';

export class OmniTubeModule implements IModule {
  name = 'OmniTube';
  slug = 'omnitube';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new OmniTubeController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateOmniTubeDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(OmniTubeRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunOmniTubeDto),
      this.controller.run
    );
  }
}

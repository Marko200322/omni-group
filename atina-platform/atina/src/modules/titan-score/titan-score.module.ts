import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TitanScoreController } from './controller/titan-score.controller';
import { CreateTitanScoreDto, RunTitanScoreDto, TitanScoreRunParamsDto } from './dto/titan-score.dto';

export class TitanScoreModule implements IModule {
  name = 'Titan Score';
  slug = 'titan-score';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new TitanScoreController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateTitanScoreDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(TitanScoreRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunTitanScoreDto),
      this.controller.run
    );
  }
}

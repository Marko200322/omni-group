import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { FollowUpController } from './controller/follow-up.controller';
import { CreateFollowUpDto, FollowUpRunParamsDto, RunFollowUpDto } from './dto/follow-up.dto';

export class FollowUpModule implements IModule {
  name = 'Follow-up';
  slug = 'follow-up';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new FollowUpController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateFollowUpDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(FollowUpRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunFollowUpDto),
      this.controller.run
    );
  }
}

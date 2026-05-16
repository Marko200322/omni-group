import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { FollowUpAutomationController } from './controller/follow-up-automation.controller';
import {
  CreateFollowUpAutomationDto,
  FollowUpAutomationRunParamsDto,
  RunFollowUpAutomationDto,
} from './dto/follow-up-automation.dto';

export class FollowUpAutomationModule implements IModule {
  name = 'Follow-up Automation';
  slug = 'follow-up-automation';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new FollowUpAutomationController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateFollowUpAutomationDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(FollowUpAutomationRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunFollowUpAutomationDto),
      this.controller.run
    );
  }
}

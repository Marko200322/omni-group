import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { OutreachController } from './controller/outreach.controller';
import { CreateOutreachDto, OutreachRunParamsDto, RunOutreachDto } from './dto/outreach.dto';

export class OutreachModule implements IModule {
  name = 'Outreach';
  slug = 'outreach';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new OutreachController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(CreateOutreachDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(OutreachRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunOutreachDto),
      this.controller.run
    );
  }
}

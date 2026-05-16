import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { LeadScoringController } from './controller/lead-scoring.controller';
import { CreateLeadScoringDto, LeadScoringRunParamsDto, RunLeadScoringDto } from './dto/lead-scoring.dto';

export class LeadScoringModule implements IModule {
  name = 'Lead Scoring';
  slug = 'lead-scoring';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new LeadScoringController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateLeadScoringDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(LeadScoringRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunLeadScoringDto),
      this.controller.run
    );
  }
}

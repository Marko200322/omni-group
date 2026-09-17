import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ProblemHunterController } from './controller/problem-hunter.controller';
import { ListProblemSignalsQueryDto, RunProblemSearchDto } from './dto/problem-hunter.dto';

export class ProblemHunterModule implements IModule {
  name = 'Problem Hunter';
  slug = 'problem-hunter';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ProblemHunterController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/status',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.status,
    );
    this.router.get(
      '/signals',
      authenticate,
      validateQuery(ListProblemSignalsQueryDto),
      this.controller.listSignals,
    );
    this.router.post(
      '/search/run',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunProblemSearchDto),
      this.controller.runSearch,
    );
  }
}

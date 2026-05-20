import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AiMemoryController } from './controller/ai-memory.controller';
import { RecallQueryDto, RememberDto } from './dto/ai-memory.dto';

export class AiMemoryModule implements IModule {
  name = 'AI Learning & Memory';
  slug = 'ai-memory';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new AiMemoryController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.post(
      '/remember',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(RememberDto),
      this.controller.remember
    );
    this.router.get(
      '/recall',
      authenticate,
      validateQuery(RecallQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.recall
    );
  }
}

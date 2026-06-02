import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { AiRagController } from './controller/ai-rag.controller';
import { IngestRagDto, SearchRagQueryDto } from './dto/ai-rag.dto';
import { AiRagService } from './service/ai-rag.service';

export class AiRagModule implements IModule {
  name = 'AI RAG';
  slug = 'ai-rag';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly service = new AiRagService();
  private readonly controller: AiRagController;

  constructor() {
    this.router = Router();
    this.controller = new AiRagController(this.service);
  }

  async initialize(): Promise<void> {
    this.router.post(
      '/ingest',
      authenticate,
      authSessionLimiter,
      validateBody(IngestRagDto),
      this.controller.ingest
    );
    this.router.get(
      '/search',
      authenticate,
      authSessionLimiter,
      validateQuery(SearchRagQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.search
    );
  }
}

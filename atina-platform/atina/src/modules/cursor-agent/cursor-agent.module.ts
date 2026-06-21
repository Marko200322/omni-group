import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { adminMutationLimiter, authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { CursorAgentController } from './controller/cursor-agent.controller';

const RunPromptDto = z
  .object({
    prompt: z.string().min(8).max(12_000),
    source: z.enum(['manual', 'mobile']).optional(),
  })
  .strict();

const ListRunsQueryDto = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export class CursorAgentModule implements IModule {
  name = 'Cursor Agent';
  slug = 'cursor-agent';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new CursorAgentController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, authSessionLimiter];
    const admin = [...auth, requireAdmin];

    this.router.get(
      '/status',
      ...admin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.status,
    );

    this.router.get(
      '/runs',
      ...admin,
      validateQuery(ListRunsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listRuns,
    );

    this.router.post(
      '/run',
      ...admin,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunPromptDto),
      this.controller.run,
    );
  }

  async shutdown(): Promise<void> {}
}

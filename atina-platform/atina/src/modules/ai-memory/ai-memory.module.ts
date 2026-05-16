import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { query } from '../../database/connection';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getAiClient } from '../../integrations';
import logger from '../../utils/logger';

const RememberDto = z
  .object({
    key: z.string().min(2).max(100),
    value: z.record(z.unknown()),
    namespace: z.string().min(2).max(50).default('global'),
  })
  .strict();

/** Escape LIKE metacharacters when using ESCAPE '!'. */
function escapeLikeFragment(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

const RecallQueryDto = z
  .object({
    namespace: z.preprocess(
      (v) => (v === undefined || v === '' ? 'global' : v),
      z.string().trim().min(2).max(50)
    ),
    key: z.preprocess(
      (v) => (v === undefined || v === '' ? undefined : v),
      z.string().trim().max(100).optional()
    ),
  })
  .strict();

export class AiMemoryModule implements IModule {
  name = 'AI Learning & Memory';
  slug = 'ai-memory';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.post('/remember', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(RememberDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO logs (user_id, level, category, action, message, context)
         VALUES ($1, 'info', 'ai-memory', 'remember', $2, $3)
         RETURNING id, created_at`,
        [req.user!.userId, `memory:${d.namespace}:${d.key}`, JSON.stringify(d.value)]
      );
      const ai = getAiClient();
      if (ai.isConfigured()) {
        void ai
          .remember({
            namespace: d.namespace,
            key: d.key,
            value: d.value,
            userId: req.user!.userId,
          })
          .catch((err) => logger.warn('AI aggregator remember failed', { error: String(err) }));
      }
      sendCreated(res, rows[0], 'Memory stored');
    });

    this.router.get('/recall', authenticate, validateQuery(RecallQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      const { namespace, key } = req.query as z.infer<typeof RecallQueryDto>;
      const likePattern =
        key !== undefined
          ? `memory:${escapeLikeFragment(namespace)}:${escapeLikeFragment(key)}%`
          : `memory:${escapeLikeFragment(namespace)}:%`;
      const { rows } = await query(
        `SELECT id, action, context, created_at
         FROM logs
         WHERE user_id = $1
           AND category = 'ai-memory'
           AND action = 'remember'
           AND message LIKE $2 ESCAPE '!'
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.user!.userId, likePattern]
      );
      sendSuccess(res, rows);
    });
  }
}

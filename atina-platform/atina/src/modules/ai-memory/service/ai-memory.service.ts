import { getAiClient } from '../../../integrations';
import { query } from '../../../database/connection';
import logger from '../../../utils/logger';
import type { RecallQueryDtoType, RememberDtoType } from '../dto/ai-memory.dto';

function escapeLikeFragment(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

export class AiMemoryService {
  private readonly ai = getAiClient();

  async remember(userId: string, dto: RememberDtoType) {
    const { rows } = await query(
      `INSERT INTO logs (user_id, level, category, action, message, context)
       VALUES ($1, 'info', 'ai-memory', 'remember', $2, $3)
       RETURNING id, created_at`,
      [userId, `memory:${dto.namespace}:${dto.key}`, JSON.stringify(dto.value)]
    );

    if (this.ai.isConfigured()) {
      void this.ai
        .remember({
          namespace: dto.namespace,
          key: dto.key,
          value: dto.value,
          userId,
        })
        .catch((err) => logger.warn('AI aggregator remember failed', { error: String(err) }));
    }

    return rows[0];
  }

  async recall(userId: string, queryParams: RecallQueryDtoType) {
    const { namespace, key } = queryParams;
    const likePattern =
      key !== undefined
        ? `memory:${escapeLikeFragment(namespace)}:${escapeLikeFragment(key)}%`
        : `memory:${escapeLikeFragment(namespace)}:%`;

    const local = await query(
      `SELECT id, action, context, created_at
       FROM logs
       WHERE user_id = $1
         AND category = 'ai-memory'
         AND action = 'remember'
         AND message LIKE $2 ESCAPE '!'
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId, likePattern]
    );

    if (this.ai.isConfigured()) {
      const remote = await this.ai.recall(namespace, key);
      if (remote) {
        return { local: local.rows, remote };
      }
    }

    return local.rows;
  }
}

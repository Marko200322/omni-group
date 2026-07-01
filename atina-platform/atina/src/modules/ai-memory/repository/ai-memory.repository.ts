import { query } from '../../../database/connection';

export type AiMemoryLogRow = {
  id: string;
  action: string;
  context: unknown;
  created_at: string;
};

export type AiMemoryInsertRow = {
  id: string;
  created_at: string;
};

export class AiMemoryRepository {
  insertRemember(userId: string, message: string, contextJson: string) {
    return query<AiMemoryInsertRow>(
      `INSERT INTO logs (user_id, level, category, action, message, context)
       VALUES ($1, 'info', 'ai-memory', 'remember', $2, $3)
       RETURNING id, created_at`,
      [userId, message, contextJson]
    );
  }

  recallByLike(userId: string, likePattern: string) {
    return query<AiMemoryLogRow>(
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
  }

  /** Platform-wide recall for fulfillment learning (cross-client success patterns). */
  recallPlatformByMessageLike(likePattern: string, limit = 10) {
    return query<AiMemoryLogRow>(
      `SELECT id, action, context, created_at
       FROM logs
       WHERE category = 'ai-memory'
         AND action = 'remember'
         AND message LIKE $1 ESCAPE '!'
       ORDER BY created_at DESC
       LIMIT $2`,
      [likePattern, Math.min(Math.max(limit, 1), 50)]
    );
  }
}

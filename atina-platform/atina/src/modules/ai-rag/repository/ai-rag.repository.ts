import { query } from '../../../database/connection';

export class AiRagRepository {
  insertChunk(
    userId: string,
    sourceId: string,
    chunkIndex: number,
    content: string,
    metadata: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO ai_rag_chunks (user_id, source_id, chunk_index, content, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, source_id, chunk_index, created_at`,
      [userId, sourceId, chunkIndex, content, JSON.stringify(metadata)]
    );
  }

  searchChunks(userId: string, pattern: string, sourceId: string | undefined, limit: number) {
    if (sourceId) {
      return query(
        `SELECT id, source_id, chunk_index, content, metadata, created_at
         FROM ai_rag_chunks
         WHERE user_id = $1 AND source_id = $2 AND content ILIKE $3
         ORDER BY created_at DESC
         LIMIT $4`,
        [userId, sourceId, `%${pattern}%`, limit]
      );
    }
    return query(
      `SELECT id, source_id, chunk_index, content, metadata, created_at
       FROM ai_rag_chunks
       WHERE user_id = $1 AND content ILIKE $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, `%${pattern}%`, limit]
    );
  }
}

import { query } from '../../../database/connection';

export type AvatarSessionRow = {
  id: string;
  user_id: string;
  agent_type: 'support' | 'sales';
  status: 'active' | 'closed';
  metadata: Record<string, unknown> | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type AvatarMessageRow = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  audio_mime: string | null;
  audio_base64: string | null;
  video_url: string | null;
  metadata: Record<string, unknown> | string;
  created_at: Date | string;
};

export class AvatarSessionsRepository {
  createSession(userId: string, agentType: 'support' | 'sales', metadata: Record<string, unknown> = {}) {
    return query<AvatarSessionRow>(
      `INSERT INTO avatar_conversation_sessions (user_id, agent_type, metadata)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, agentType, JSON.stringify(metadata)]
    );
  }

  getSessionForUser(sessionId: string, userId: string) {
    return query<AvatarSessionRow>(
      `SELECT * FROM avatar_conversation_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
  }

  insertMessage(params: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    audioMime?: string | null;
    audioBase64?: string | null;
    videoUrl?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return query<AvatarMessageRow>(
      `INSERT INTO avatar_conversation_messages
         (session_id, role, text, audio_mime, audio_base64, video_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        params.sessionId,
        params.role,
        params.text,
        params.audioMime ?? null,
        params.audioBase64 ?? null,
        params.videoUrl ?? null,
        JSON.stringify(params.metadata ?? {}),
      ]
    );
  }

  listMessages(sessionId: string, limit = 40) {
    return query<AvatarMessageRow>(
      `SELECT id, session_id, role, text, audio_mime, video_url, metadata, created_at
       FROM avatar_conversation_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit]
    );
  }

  listMessagesForChat(sessionId: string, limit = 20) {
    return query<Pick<AvatarMessageRow, 'role' | 'text'>>(
      `SELECT role, text FROM avatar_conversation_messages
       WHERE session_id = $1 AND role IN ('user', 'assistant')
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit]
    );
  }
}

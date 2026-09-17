import { query } from '../../../database/connection';

export type LiveCallSessionRow = {
  id: string;
  user_id: string;
  meeting_request_id: string | null;
  agent_id: string;
  agent_type: 'support' | 'sales';
  live_provider: string;
  platform: 'browser' | 'zoom' | 'google_meet';
  status: 'pending' | 'active' | 'ended' | 'failed' | 'handoff';
  external_session_id: string | null;
  recall_bot_id: string | null;
  meeting_url: string | null;
  join_url: string | null;
  provider_payload: Record<string, unknown> | string;
  turn_count: number;
  max_duration_minutes: number;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  metadata: Record<string, unknown> | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export class LiveCallSessionsRepository {
  insertSession(params: {
    userId: string;
    meetingRequestId?: string | null;
    agentId: string;
    agentType: 'support' | 'sales';
    liveProvider: string;
    platform: 'browser' | 'zoom' | 'google_meet';
    externalSessionId?: string | null;
    recallBotId?: string | null;
    meetingUrl?: string | null;
    joinUrl?: string | null;
    providerPayload: Record<string, unknown>;
    maxDurationMinutes: number;
    metadata?: Record<string, unknown>;
  }) {
    return query<LiveCallSessionRow>(
      `INSERT INTO live_call_sessions
         (user_id, meeting_request_id, agent_id, agent_type, live_provider, platform, status,
          external_session_id, recall_bot_id, meeting_url, join_url, provider_payload,
          max_duration_minutes, started_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, NOW(), $13)
       RETURNING *`,
      [
        params.userId,
        params.meetingRequestId ?? null,
        params.agentId,
        params.agentType,
        params.liveProvider,
        params.platform,
        params.externalSessionId ?? null,
        params.recallBotId ?? null,
        params.meetingUrl ?? null,
        params.joinUrl ?? null,
        JSON.stringify(params.providerPayload),
        params.maxDurationMinutes,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  }

  getById(id: string) {
    return query<LiveCallSessionRow>('SELECT * FROM live_call_sessions WHERE id = $1', [id]);
  }

  getByIdForUser(id: string, userId: string) {
    return query<LiveCallSessionRow>(
      'SELECT * FROM live_call_sessions WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
  }

  updateStatus(id: string, status: LiveCallSessionRow['status'], patch?: Record<string, unknown>) {
    const meta = patch ? JSON.stringify(patch) : null;
    return query<LiveCallSessionRow>(
      `UPDATE live_call_sessions
       SET status = $2,
           ended_at = CASE WHEN $2 IN ('ended', 'failed', 'handoff') THEN NOW() ELSE ended_at END,
           metadata = CASE WHEN $3::jsonb IS NOT NULL THEN metadata || $3::jsonb ELSE metadata END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, meta],
    );
  }

  incrementTurnCount(id: string) {
    return query<LiveCallSessionRow>(
      `UPDATE live_call_sessions SET turn_count = turn_count + 1, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
  }

  updateRecallBot(id: string, recallBotId: string) {
    return query<LiveCallSessionRow>(
      `UPDATE live_call_sessions SET recall_bot_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, recallBotId],
    );
  }

  insertTurn(params: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    inputText?: string | null;
    outputText?: string | null;
    latencyMs?: number | null;
    provider?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return query<{ id: string }>(
      `INSERT INTO live_call_turns (session_id, role, input_text, output_text, latency_ms, provider, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        params.sessionId,
        params.role,
        params.inputText ?? null,
        params.outputText ?? null,
        params.latencyMs ?? null,
        params.provider ?? null,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  }

  listTurns(sessionId: string, limit = 50) {
    return query<{
      id: string;
      role: string;
      input_text: string | null;
      output_text: string | null;
      latency_ms: number | null;
      created_at: Date | string;
    }>(
      `SELECT id, role, input_text, output_text, latency_ms, created_at
       FROM live_call_turns WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [sessionId, limit],
    );
  }

  findByRecallBotId(recallBotId: string) {
    return query<LiveCallSessionRow>(
      'SELECT * FROM live_call_sessions WHERE recall_bot_id = $1 ORDER BY created_at DESC LIMIT 1',
      [recallBotId],
    );
  }

  mergeMetadata(id: string, patch: Record<string, unknown>) {
    return query<LiveCallSessionRow>(
      `UPDATE live_call_sessions
       SET metadata = metadata || $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(patch)],
    );
  }
}

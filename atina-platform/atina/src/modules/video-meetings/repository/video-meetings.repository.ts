import { query } from '../../../database/connection';

export type VideoMeetingRow = {
  id: string;
  user_id: string;
  meeting_type: 'support' | 'sales';
  provider: 'manual' | 'zoom' | 'google_meet';
  status: 'pending' | 'scheduled' | 'completed' | 'canceled';
  topic: string;
  description: string | null;
  scheduled_at: Date | string | null;
  duration_minutes: number;
  meeting_url: string | null;
  external_meeting_id: string | null;
  agent_name: string | null;
  agent_avatar_url: string | null;
  metadata: Record<string, unknown> | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export class VideoMeetingsRepository {
  execute<T = unknown>(text: string, params?: unknown[]) {
    return query<T>(text, params);
  }

  insertRequest(params: {
    userId: string;
    meetingType: 'support' | 'sales';
    provider: 'manual' | 'zoom' | 'google_meet';
    status: 'pending' | 'scheduled';
    topic: string;
    description: string | null;
    scheduledAt: Date | null;
    durationMinutes: number;
    meetingUrl: string | null;
    externalMeetingId: string | null;
    agentName: string;
    agentAvatarUrl: string;
    metadata: Record<string, unknown>;
  }) {
    return query<VideoMeetingRow>(
      `INSERT INTO video_meeting_requests
         (user_id, meeting_type, provider, status, topic, description, scheduled_at,
          duration_minutes, meeting_url, external_meeting_id, agent_name, agent_avatar_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        params.userId,
        params.meetingType,
        params.provider,
        params.status,
        params.topic,
        params.description,
        params.scheduledAt,
        params.durationMinutes,
        params.meetingUrl,
        params.externalMeetingId,
        params.agentName,
        params.agentAvatarUrl,
        JSON.stringify(params.metadata),
      ]
    );
  }

  getById(id: string) {
    return query<VideoMeetingRow>('SELECT * FROM video_meeting_requests WHERE id = $1', [id]);
  }

  listByUser(userId: string, meetingType?: 'support' | 'sales') {
    if (meetingType) {
      return query<VideoMeetingRow>(
        `SELECT * FROM video_meeting_requests
         WHERE user_id = $1 AND meeting_type = $2
         ORDER BY created_at DESC LIMIT 50`,
        [userId, meetingType]
      );
    }
    return query<VideoMeetingRow>(
      `SELECT * FROM video_meeting_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
  }

  updateScheduled(id: string, meetingUrl: string, externalMeetingId: string | null, scheduledAt: Date) {
    return query<VideoMeetingRow>(
      `UPDATE video_meeting_requests
       SET status = 'scheduled', meeting_url = $2, external_meeting_id = $3,
           scheduled_at = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, meetingUrl, externalMeetingId, scheduledAt]
    );
  }

  getUserContact(userId: string) {
    return query<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE id = $1',
      [userId]
    );
  }
}

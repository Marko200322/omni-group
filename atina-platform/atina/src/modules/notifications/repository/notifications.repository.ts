import { query } from '../../../database/connection';

export class NotificationsRepository {
  insert(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel: string;
    actionUrl: string | null;
    metadata: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO notifications (user_id, type, title, message, channel, action_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId,
        data.type,
        data.title,
        data.message,
        data.channel,
        data.actionUrl,
        JSON.stringify(data.metadata),
      ]
    );
  }

  getUserEmail(userId: string) {
    return query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  }

  list(
    userId: string,
    opts: { unreadOnly?: boolean; limit: number; offset: number }
  ) {
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    if (opts.unreadOnly) conditions.push('is_read = false');
    const where = `WHERE ${conditions.join(' AND ')}`;
    return Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM notifications ${where}`, values),
      query(
        `SELECT * FROM notifications ${where}
         ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, opts.limit, opts.offset]
      ),
    ]);
  }

  markRead(id: string, userId: string) {
    return query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  }

  markAllRead(userId: string) {
    return query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }

  delete(id: string, userId: string) {
    return query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  unreadCount(userId: string) {
    return query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }
}

import { query } from '../../../database/connection';

export class WebPushRepository {
  async upsert(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent,
         updated_at = NOW()`,
      [input.userId, input.endpoint, input.p256dh, input.auth, input.userAgent ?? null],
    );
  }

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);
  }

  async listByUser(userId: string) {
    const { rows } = await query<{
      endpoint: string;
      p256dh: string;
      auth: string;
    }>(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId]);
    return rows;
  }

  async listAdminUserIds(): Promise<string[]> {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'operator') AND is_active = true`,
    );
    return rows.map((r) => r.id);
  }
}

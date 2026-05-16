import { query } from '../../../database/connection';

export class GdprRepository {
  create(userId: string, requestType: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO gdpr_requests (user_id, request_type, request_payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, requestType, JSON.stringify(payload)]
    );
  }

  listByUser(userId: string) {
    return query(
      `SELECT * FROM gdpr_requests
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );
  }

  listAll() {
    return query(
      `SELECT gr.*, u.email
       FROM gdpr_requests gr
       JOIN users u ON u.id = gr.user_id
       ORDER BY gr.requested_at DESC`
    );
  }

  process(id: string, status: string, response: Record<string, unknown>) {
    return query(
      `UPDATE gdpr_requests
       SET status = $2, response_payload = $3, processed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, JSON.stringify(response)]
    );
  }
}

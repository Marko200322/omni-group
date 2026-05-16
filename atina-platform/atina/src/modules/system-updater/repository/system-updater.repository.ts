import { query } from '../../../database/connection';

export class SystemUpdaterRepository {
  queue(requestedBy: string, targetVersion: string, notes: string) {
    return query(
      `INSERT INTO updater_jobs (requested_by, target_version, status, notes)
       VALUES ($1, $2, 'queued', $3)
       RETURNING *`,
      [requestedBy, targetVersion, notes || null]
    );
  }

  list() {
    return query(
      `SELECT uj.*, u.email AS requested_by_email
       FROM updater_jobs uj
       LEFT JOIN users u ON u.id = uj.requested_by
       ORDER BY uj.created_at DESC`
    );
  }

  finish(id: string, status: string, result: Record<string, unknown>) {
    return query(
      `UPDATE updater_jobs
       SET status = $2, result_json = $3, finished_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, JSON.stringify(result)]
    );
  }
}

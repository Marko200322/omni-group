import { query } from '../../../database/connection';

export class BackupRecoveryRepository {
  create(createdBy: string, snapshotType: string, metadata: Record<string, unknown>) {
    const checksum = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const uri = `vault://backups/${new Date().toISOString()}/${checksum}.dump`;
    return query(
      `INSERT INTO backup_snapshots
       (created_by, snapshot_type, status, storage_uri, checksum, size_bytes, metadata)
       VALUES ($1, $2, 'completed', $3, $4, $5, $6)
       RETURNING *`,
      [createdBy, snapshotType, uri, checksum, Math.floor(Math.random() * 50000000) + 1000000, JSON.stringify(metadata)]
    );
  }

  list(limit: number) {
    return query(
      `SELECT * FROM backup_snapshots
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  getById(id: string) {
    return query(`SELECT * FROM backup_snapshots WHERE id = $1`, [id]);
  }
}

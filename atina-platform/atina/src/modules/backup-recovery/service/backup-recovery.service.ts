import { NotFoundError } from '../../../utils/errors';
import { getStorageClient } from '../../../integrations';
import { BackupRecoveryRepository } from '../repository/backup-recovery.repository';

export class BackupRecoveryService {
  private readonly repo = new BackupRecoveryRepository();
  private readonly storage = getStorageClient();

  async createBackup(userId: string, snapshotType: string, metadata: Record<string, unknown>) {
    const { rows } = await this.repo.create(userId, snapshotType, metadata);
    const snapshot = rows[0] as Record<string, unknown>;
    if (this.storage.isConfigured() && snapshot?.id) {
      const remote = await this.storage.createBackup({
        snapshotId: String(snapshot.id),
        snapshotType,
        metadata,
        userId,
      });
      if (remote) {
        return { ...snapshot, remoteBackup: remote };
      }
    }
    return snapshot;
  }

  async listBackups(limit = 50) {
    const { rows } = await this.repo.list(limit);
    return rows;
  }

  async restoreBackup(snapshotId: string, reason: string) {
    const { rows } = await this.repo.getById(snapshotId);
    if (!rows[0]) throw new NotFoundError('Backup snapshot');
    return {
      snapshotId,
      status: 'accepted',
      reason,
      queuedAt: new Date().toISOString(),
    };
  }
}

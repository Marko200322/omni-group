import type { z } from 'zod';
import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ListBackupsQueryDto } from '../dto/backup-recovery.dto';
import { BackupRecoveryService } from '../service/backup-recovery.service';

type ListBackupsQuery = z.infer<typeof ListBackupsQueryDto>;

export class BackupRecoveryController {
  private readonly service = new BackupRecoveryService();

  createBackup = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.createBackup(req.user!.userId, req.body.snapshotType, req.body.metadata);
    sendCreated(res, row, 'Backup snapshot created');
  };

  listBackups = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListBackupsQuery;
    const rows = await this.service.listBackups(limit);
    sendSuccess(res, rows);
  };

  restoreBackup = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.restoreBackup(req.body.snapshotId, req.body.reason);
    sendSuccess(res, data, 'Restore queued');
  };
}

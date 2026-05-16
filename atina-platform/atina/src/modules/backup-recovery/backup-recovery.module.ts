import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { BackupRecoveryController } from './controller/backup-recovery.controller';
import { CreateBackupDto, ListBackupsQueryDto, RestoreBackupDto } from './dto/backup-recovery.dto';

export class BackupRecoveryModule implements IModule {
  name = 'Backup & Recovery';
  slug = 'backup-recovery';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new BackupRecoveryController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(ListBackupsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listBackups
    );
    this.router.post('/snapshot', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(CreateBackupDto), this.controller.createBackup);
    this.router.post('/restore', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(RestoreBackupDto), this.controller.restoreBackup);
  }
}

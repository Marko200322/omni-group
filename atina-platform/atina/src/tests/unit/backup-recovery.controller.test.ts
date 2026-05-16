import { Request, Response } from 'express';
import { BackupRecoveryController } from '../../modules/backup-recovery/controller/backup-recovery.controller';
import { BackupRecoveryService } from '../../modules/backup-recovery/service/backup-recovery.service';

jest.mock('../../modules/backup-recovery/service/backup-recovery.service');

const MockBackupRecoveryService = BackupRecoveryService as jest.MockedClass<typeof BackupRecoveryService>;

describe('BackupRecoveryController', () => {
  let controller: BackupRecoveryController;
  let mockService: jest.Mocked<BackupRecoveryService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BackupRecoveryController();
    mockService = MockBackupRecoveryService.mock.instances[0] as jest.Mocked<BackupRecoveryService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({ user: { userId, role: 'admin', email: 'a@b.com' } }) as Request;

  it('createBackup calls service and returns 201', async () => {
    const row = { id: 'snap-1' };
    mockService.createBackup.mockResolvedValue(row as never);
    const r = res();
    await controller.createBackup(
      { ...authed('u9'), body: { snapshotType: 'manual', metadata: { k: 1 } } } as Request,
      r
    );
    expect(mockService.createBackup).toHaveBeenCalledWith('u9', 'manual', { k: 1 });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it('listBackups returns rows from service', async () => {
    const rows = [{ id: 'a' }];
    mockService.listBackups.mockResolvedValue(rows as never);
    const r = res();
    await controller.listBackups({ query: { limit: 50 } } as unknown as Request, r);
    expect(mockService.listBackups).toHaveBeenCalledWith(50);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('listBackups forwards limit from query', async () => {
    mockService.listBackups.mockResolvedValue([] as never);
    const r = res();
    await controller.listBackups({ query: { limit: 15 } } as unknown as Request, r);
    expect(mockService.listBackups).toHaveBeenCalledWith(15);
  });

  it('restoreBackup forwards snapshotId and reason', async () => {
    const payload = { snapshotId: 'sid', status: 'accepted', reason: 'drill', queuedAt: 't' };
    mockService.restoreBackup.mockResolvedValue(payload as never);
    const r = res();
    await controller.restoreBackup(
      {
        ...authed(),
        body: { snapshotId: '123e4567-e89b-12d3-a456-426614174000', reason: 'planned drill' },
      } as Request,
      r
    );
    expect(mockService.restoreBackup).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      'planned drill'
    );
    expect(r.status).toHaveBeenCalledWith(200);
  });
});

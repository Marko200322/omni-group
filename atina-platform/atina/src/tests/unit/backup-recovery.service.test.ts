import { BackupRecoveryService } from '../../modules/backup-recovery/service/backup-recovery.service';
import { NotFoundError } from '../../utils/errors';

// eslint-disable-next-line no-var
var backupRepo: {
  create: jest.Mock;
  list: jest.Mock;
  getById: jest.Mock;
};

const mockStorageClient = {
  isConfigured: jest.fn().mockReturnValue(false),
  createBackup: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getStorageClient: jest.fn(() => mockStorageClient),
}));

jest.mock('../../modules/backup-recovery/repository/backup-recovery.repository', () => {
  backupRepo = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
  };
  return {
    BackupRecoveryRepository: jest.fn().mockImplementation(() => backupRepo),
  };
});

describe('BackupRecoveryService', () => {
  let service: BackupRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageClient.isConfigured.mockReturnValue(false);
    service = new BackupRecoveryService();
  });

  it('createBackup returns the repository row', async () => {
    const row = { id: 'snap-1' };
    backupRepo.create.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    await expect(service.createBackup('u1', 'full', { region: 'eu' })).resolves.toBe(row);
    expect(backupRepo.create).toHaveBeenCalledWith('u1', 'full', { region: 'eu' });
  });

  it('createBackup attaches remote backup when storage aggregator is configured', async () => {
    const row = { id: 'snap-2' };
    backupRepo.create.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
    mockStorageClient.isConfigured.mockReturnValue(true);
    mockStorageClient.createBackup.mockResolvedValueOnce({ remoteId: 'r2' });

    await expect(service.createBackup('u1', 'full', { region: 'eu' })).resolves.toEqual({
      ...row,
      remoteBackup: { remoteId: 'r2' },
    });
  });

  it('listBackups passes limit default and custom', async () => {
    backupRepo.list.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await service.listBackups();
    expect(backupRepo.list).toHaveBeenCalledWith(50);

    backupRepo.list.mockResolvedValueOnce({ rows: [{ id: 'x' }], rowCount: 1 });
    await service.listBackups(10);
    expect(backupRepo.list).toHaveBeenCalledWith(10);
  });

  it('restoreBackup throws when snapshot is missing', async () => {
    backupRepo.getById.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.restoreBackup('missing', 'drill')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('restoreBackup returns an accepted queue envelope', async () => {
    backupRepo.getById.mockResolvedValueOnce({ rows: [{ id: 'snap-1' }], rowCount: 1 });

    const out = await service.restoreBackup('snap-1', 'customer request');
    expect(out).toEqual(
      expect.objectContaining({
        snapshotId: 'snap-1',
        status: 'accepted',
        reason: 'customer request',
      })
    );
    expect(typeof out.queuedAt).toBe('string');
  });
});

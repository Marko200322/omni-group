import { BackupRecoveryRepository } from '../../modules/backup-recovery/repository/backup-recovery.repository';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('BackupRecoveryRepository', () => {
  let repo: BackupRecoveryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new BackupRecoveryRepository();
  });

  it('create passes metadata as JSON and snapshot type', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'b1' }], rowCount: 1 } as never);
    const meta = { region: 'eu-west' };
    await repo.create('user-1', 'full', meta);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO backup_snapshots'),
      expect.arrayContaining(['user-1', 'full', expect.stringMatching(/^vault:\/\//), expect.stringMatching(/^chk_/), expect.any(Number), JSON.stringify(meta)])
    );
  });

  it('list passes limit placeholder', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'x' }], rowCount: 1 } as never);
    const result = await repo.list(25);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [25]);
    expect(result.rows).toEqual([{ id: 'x' }]);
  });

  it('getById passes id placeholder', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'snap-9' }], rowCount: 1 } as never);
    await repo.getById('snap-9');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['snap-9']);
  });
});

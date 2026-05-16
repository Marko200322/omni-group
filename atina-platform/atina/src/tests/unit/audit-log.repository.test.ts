import { AuditLogRepository } from '../../modules/audit-log/repository/audit-log.repository';
import * as db from '../../database/connection';

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('AuditLogRepository', () => {
  let repo: AuditLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    repo = new AuditLogRepository();
  });

  it('insert passes JSON-serialized payload and null actor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1' }], rowCount: 1 } as never);
    await repo.insert(null, 't', 'E', 'id1', 'warn', { k: 1 });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_events'),
      [null, 't', 'E', 'id1', 'warn', JSON.stringify({ k: 1 })]
    );
  });

  it('list passes limit placeholder', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'x' }], rowCount: 1 } as never);
    const result = await repo.list(25);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $1'),
      [25]
    );
    expect(result.rows).toEqual([{ id: 'x' }]);
  });
});

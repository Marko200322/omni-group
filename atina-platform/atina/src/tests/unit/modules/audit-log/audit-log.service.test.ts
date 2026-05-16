import { AuditLogService } from '../../../../modules/audit-log/service/audit-log.service';
import { AuditLogRepository } from '../../../../modules/audit-log/repository/audit-log.repository';

jest.mock('../../../../modules/audit-log/repository/audit-log.repository');

const MockRepo = AuditLogRepository as jest.MockedClass<typeof AuditLogRepository>;

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockRepo: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogService();
    mockRepo = MockRepo.mock.instances[0] as jest.Mocked<AuditLogRepository>;
  });

  it('record returns first inserted row', async () => {
    const row = { id: 'r1', event_type: 'x' };
    mockRepo.insert.mockResolvedValue({ rows: [row], rowCount: 1 } as never);

    const out = await service.record('u1', 'evt', 'Ent', 'e1', 'info', { a: 1 });

    expect(mockRepo.insert).toHaveBeenCalledWith('u1', 'evt', 'Ent', 'e1', 'info', { a: 1 });
    expect(out).toEqual(row);
  });

  it('record supports null actor', async () => {
    mockRepo.insert.mockResolvedValue({ rows: [{ id: 'anon' }], rowCount: 1 } as never);
    await service.record(null, 'e', 'T', 'id', 'debug', {});
    expect(mockRepo.insert).toHaveBeenCalledWith(null, 'e', 'T', 'id', 'debug', {});
  });

  it('list returns rows from repository with default limit', async () => {
    mockRepo.list.mockResolvedValue({ rows: [{ id: 'a' }, { id: 'b' }], rowCount: 2 } as never);
    const rows = await service.list();
    expect(mockRepo.list).toHaveBeenCalledWith(200);
    expect(rows).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('list forwards custom limit', async () => {
    mockRepo.list.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    await service.list(50);
    expect(mockRepo.list).toHaveBeenCalledWith(50);
  });
});

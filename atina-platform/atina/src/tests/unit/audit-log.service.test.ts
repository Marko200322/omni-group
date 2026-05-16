import { AuditLogService } from '../../modules/audit-log/service/audit-log.service';

// eslint-disable-next-line no-var
var auditRepoImpl: { insert: jest.Mock; list: jest.Mock };

jest.mock('../../modules/audit-log/repository/audit-log.repository', () => {
  auditRepoImpl = {
    insert: jest.fn().mockResolvedValue({ rows: [{ id: 'row1', event_type: 'e' }] }),
    list: jest.fn().mockResolvedValue({ rows: [{ id: 'l1' }] }),
  };
  return {
    AuditLogRepository: jest.fn().mockImplementation(() => auditRepoImpl),
  };
});

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogService();
  });

  it('record forwards to repository and returns first row', async () => {
    const row = await service.record('uid', 'login', 'User', 'u1', 'info', { ip: '1.2.3.4' });
    expect(row).toEqual({ id: 'row1', event_type: 'e' });
    expect(auditRepoImpl.insert).toHaveBeenCalledWith(
      'uid',
      'login',
      'User',
      'u1',
      'info',
      { ip: '1.2.3.4' }
    );
  });

  it('list uses default limit', async () => {
    const rows = await service.list();
    expect(rows).toEqual([{ id: 'l1' }]);
    expect(auditRepoImpl.list).toHaveBeenCalledWith(200);
  });

  it('list respects custom limit', async () => {
    await service.list(50);
    expect(auditRepoImpl.list).toHaveBeenCalledWith(50);
  });
});

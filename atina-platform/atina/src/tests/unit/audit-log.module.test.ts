import { AuditLogModule } from '../../modules/audit-log/audit-log.module';

// eslint-disable-next-line no-var
var auditRepoImpl: { insert: jest.Mock; list: jest.Mock };

jest.mock('../../modules/audit-log/repository/audit-log.repository', () => {
  auditRepoImpl = {
    insert: jest.fn().mockResolvedValue({ rows: [{ id: 'a1' }] }),
    list: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    AuditLogRepository: jest.fn().mockImplementation(() => auditRepoImpl),
  };
});

describe('AuditLogModule', () => {
  it('initialize registers list and record routes', async () => {
    const m = new AuditLogModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});

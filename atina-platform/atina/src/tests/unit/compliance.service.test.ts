import { ComplianceService } from '../../modules/compliance/service/compliance.service';

// eslint-disable-next-line no-var
var complianceRepo: {
  insert: jest.Mock;
  list: jest.Mock;
};

jest.mock('../../modules/compliance/repository/compliance.repository', () => {
  complianceRepo = {
    insert: jest.fn(),
    list: jest.fn(),
  };
  return {
    ComplianceRepository: jest.fn().mockImplementation(() => complianceRepo),
  };
});

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComplianceService();
  });

  it('record forwards arguments to the repository', async () => {
    const row = { id: 'cr-1' };
    complianceRepo.insert.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const evidence = { doc: 'ref-9' };
    await expect(
      service.record('u1', 'SOC2', 'CC6.1', 'pass', 'reviewed', evidence)
    ).resolves.toBe(row);

    expect(complianceRepo.insert).toHaveBeenCalledWith('u1', 'SOC2', 'CC6.1', 'pass', 'reviewed', evidence);
  });

  it('record allows null userId for system-scoped checks', async () => {
    complianceRepo.insert.mockResolvedValueOnce({ rows: [{ id: 'x' }], rowCount: 1 });

    await service.record(null, 'ISO27001', 'A.5', 'open', '', {});

    expect(complianceRepo.insert).toHaveBeenCalledWith(null, 'ISO27001', 'A.5', 'open', '', {});
  });

  it('list passes optional framework filter', async () => {
    complianceRepo.list.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await service.list();
    expect(complianceRepo.list).toHaveBeenCalledWith(undefined);

    complianceRepo.list.mockResolvedValueOnce({ rows: [{ id: '1' }], rowCount: 1 });
    await service.list('SOC2');
    expect(complianceRepo.list).toHaveBeenCalledWith('SOC2');
  });
});

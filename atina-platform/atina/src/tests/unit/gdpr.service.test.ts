import { NotFoundError } from '../../utils/errors';
import { GdprService } from '../../modules/gdpr/service/gdpr.service';

// eslint-disable-next-line no-var
var gdprRepo: {
  create: jest.Mock;
  listByUser: jest.Mock;
  listAll: jest.Mock;
  process: jest.Mock;
};

jest.mock('../../modules/gdpr/repository/gdpr.repository', () => {
  gdprRepo = {
    create: jest.fn(),
    listByUser: jest.fn(),
    listAll: jest.fn(),
    process: jest.fn(),
  };
  return {
    GdprRepository: jest.fn().mockImplementation(() => gdprRepo),
  };
});

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GdprService();
  });

  it('create forwards arguments to the repository', async () => {
    const row = { id: 'gr-1' };
    const payload = { reason: 'export' };
    gdprRepo.create.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    await expect(service.create('u1', 'export', payload)).resolves.toBe(row);

    expect(gdprRepo.create).toHaveBeenCalledWith('u1', 'export', payload);
  });

  it('listForUser returns rows from the repository', async () => {
    const rows = [{ id: 'a' }];
    gdprRepo.listByUser.mockResolvedValueOnce({ rows, rowCount: rows.length });

    await expect(service.listForUser('u9')).resolves.toEqual(rows);
    expect(gdprRepo.listByUser).toHaveBeenCalledWith('u9');
  });

  it('listAll returns rows from the repository', async () => {
    const rows = [{ id: 'b', email: 'x@y.com' }];
    gdprRepo.listAll.mockResolvedValueOnce({ rows, rowCount: rows.length });

    await expect(service.listAll()).resolves.toEqual(rows);
    expect(gdprRepo.listAll).toHaveBeenCalled();
  });

  it('process returns the updated row', async () => {
    const row = { id: 'gr-2', status: 'completed' };
    const response = { note: 'ok' };
    gdprRepo.process.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    await expect(service.process('rid', 'completed', response)).resolves.toBe(row);
    expect(gdprRepo.process).toHaveBeenCalledWith('rid', 'completed', response);
  });

  it('process throws when no row is returned', async () => {
    gdprRepo.process.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.process('missing', 'approved', {})).rejects.toThrow(NotFoundError);
  });
});

import { ConflictError } from '../../utils/errors';
import { ValidatorService } from '../../modules/validator/service/validator.service';
import * as ecosystemIdempotency from '../../utils/ecosystem-idempotency';

const mockRepo = {
  listByUser: jest.fn(),
  create: jest.fn(),
  getOwned: jest.fn(),
  createRun: jest.fn(),
  updateAfterRun: jest.fn(),
};

jest.mock('../../modules/validator/repository/validator.repository', () => ({
  ValidatorRepository: jest.fn().mockImplementation(() => mockRepo),
}));

jest.mock('../../utils/ecosystem-idempotency', () => {
  const actual = jest.requireActual<typeof import('../../utils/ecosystem-idempotency')>(
    '../../utils/ecosystem-idempotency'
  );
  return {
    ...actual,
    withEcosystemIdempotencyLock: jest.fn(
      async (_systemId: string, _idempotencyKey: string, work: () => Promise<unknown>) => work()
    ),
    findRecentEcosystemRunByIdempotencyKey: jest.fn(),
  };
});

const mockWithLock = ecosystemIdempotency.withEcosystemIdempotencyLock as jest.MockedFunction<
  typeof ecosystemIdempotency.withEcosystemIdempotencyLock
>;
const mockFindRecent = ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey as jest.MockedFunction<
  typeof ecosystemIdempotency.findRecentEcosystemRunByIdempotencyKey
>;

describe('ValidatorService', () => {
  let service: ValidatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ValidatorService();
    mockRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    mockRepo.create.mockResolvedValue({ rows: [{ id: 'new' }] });
    mockRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sys-1' }] });
    mockRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-1' }] });
    mockRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    mockFindRecent.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('list returns rows from repository', async () => {
    const rows = await service.list('u1');
    expect(rows).toEqual([{ id: 'w1' }]);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('create delegates to repository', async () => {
    const row = await service.create('u1', {
      name: 'My workspace',
      budgetAllocated: 100,
      profile: 'strict',
    });
    expect(row).toEqual({ id: 'new' });
    expect(mockRepo.create).toHaveBeenCalledWith('u1', 'My workspace', 100, 'strict');
  });

  it('status returns parsed shape', async () => {
    const status = await service.status();
    expect(status.modes).toEqual(['validate', 'sanitize', 'enrich']);
    expect(status.pipelineCapacity.maxItemsPerRun).toBe(750);
    expect(status.pipelineCapacity.cooldownSeconds).toBe(20);
  });

  it.each([
    ['validate', 'validator_validate'],
    ['sanitize', 'validator_sanitize'],
    ['enrich', 'validator_enrich'],
  ] as const)('run uses mode %s in run_type', async (mode, expectedPrefix) => {
    await service.run('sys-1', 'u1', {
      mode,
      intensity: 30,
      valueEstimate: 45,
    });

    expect(mockRepo.createRun).toHaveBeenCalledWith(
      'sys-1',
      expectedPrefix,
      expect.objectContaining({ mode, intensity: 30 })
    );
    expect(mockRepo.updateAfterRun).toHaveBeenCalled();
  });

  it('run throws when workspace not found', async () => {
    mockRepo.getOwned.mockResolvedValueOnce({ rows: [] });
    await expect(service.run('missing', 'u1', { mode: 'validate', intensity: 10 })).rejects.toThrow(
      'Validator workspace not found'
    );
  });

  describe('run idempotency', () => {
    const dto = { mode: 'validate' as const, intensity: 30, valueEstimate: 45 };

    it('uses lock and creates a new run when key is set and no prior run exists', async () => {
      const result = await service.run('sys-1', 'u1', dto, 'idem-1');

      expect(mockWithLock).toHaveBeenCalledWith('sys-1', 'idem-1', expect.any(Function));
      expect(mockFindRecent).toHaveBeenCalledWith('sys-1', 'idem-1');
      expect(mockRepo.createRun).toHaveBeenCalled();
      expect(mockRepo.updateAfterRun).toHaveBeenCalled();
      expect(result).toEqual({ id: 'run-1' });
    });

    it('returns existing run when idempotency key matches prior payload', async () => {
      const existing = {
        id: 'prior-run',
        output_payload: {
          mode: 'validate',
          intensity: 30,
          estimatedValue: 45,
          idempotency_key: 'idem-1',
        },
      };
      mockFindRecent.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await service.run('sys-1', 'u1', dto, 'idem-1');

      expect(result).toBe(existing);
      expect(mockRepo.createRun).not.toHaveBeenCalled();
      expect(mockRepo.updateAfterRun).not.toHaveBeenCalled();
    });

    it('returns existing run when prior payload omits estimatedValue and effective estimate is default 45', async () => {
      const existing = {
        id: 'prior-run-legacy',
        output_payload: { mode: 'validate', intensity: 30, idempotency_key: 'idem-legacy' },
      };
      mockFindRecent.mockResolvedValueOnce({ rows: [existing], rowCount: 1 });

      const result = await service.run('sys-1', 'u1', { mode: 'validate', intensity: 30 }, 'idem-legacy');

      expect(result).toBe(existing);
      expect(mockRepo.createRun).not.toHaveBeenCalled();
    });

    it('throws ConflictError when prior run mode differs', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [{ id: 'prior', output_payload: { mode: 'sanitize', intensity: 30, estimatedValue: 45 } }],
        rowCount: 1,
      });

      await expect(service.run('sys-1', 'u1', dto, 'idem-1')).rejects.toMatchObject({
        message: 'Idempotency key already used with different validator run parameters',
        statusCode: 409,
      });
    });

    it('throws ConflictError when prior run intensity differs', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [{ id: 'prior', output_payload: { mode: 'validate', intensity: 99, estimatedValue: 45 } }],
        rowCount: 1,
      });

      await expect(service.run('sys-1', 'u1', dto, 'idem-1')).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws ConflictError when prior run estimatedValue differs from effective valueEstimate', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [
          {
            id: 'prior',
            output_payload: { mode: 'validate', intensity: 30, estimatedValue: 100 },
          },
        ],
        rowCount: 1,
      });

      await expect(service.run('sys-1', 'u1', dto, 'idem-1')).rejects.toMatchObject({
        message: 'Idempotency key already used with different validator run parameters',
        statusCode: 409,
      });
    });

    it('trims idempotency key before lock and lookup', async () => {
      await service.run('sys-1', 'u1', dto, '  spaced  ');

      expect(mockWithLock).toHaveBeenCalledWith('sys-1', 'spaced', expect.any(Function));
      expect(mockFindRecent).toHaveBeenCalledWith('sys-1', 'spaced');
    });
  });
});

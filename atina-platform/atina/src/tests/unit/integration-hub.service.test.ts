import { IntegrationHubService } from '../../modules/integration-hub/service/integration-hub.service';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import * as ecosystemIdempotency from '../../utils/ecosystem-idempotency';

// eslint-disable-next-line no-var
var integrationHubRepo: {
  create: jest.Mock;
  listByUser: jest.Mock;
  touchSync: jest.Mock;
  ensureShadowEcosystemForIntegration: jest.Mock;
  createRun: jest.Mock;
};

jest.mock('../../modules/integration-hub/repository/integration-hub.repository', () => {
  integrationHubRepo = {
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'integration-1' }], rowCount: 1 }),
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'integration-1' }], rowCount: 1 }),
    touchSync: jest.fn(),
    ensureShadowEcosystemForIntegration: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-1' }], rowCount: 1 }),
  };
  return {
    IntegrationHubRepository: jest.fn().mockImplementation(() => integrationHubRepo),
  };
});

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

describe('IntegrationHubService', () => {
  let service: IntegrationHubService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegrationHubService();
    mockFindRecent.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('create validates required text fields', async () => {
    await expect(service.create('u1', '', 'Slack', {}, {})).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create('u1', 'slack', '', {}, {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('create validates object contracts', async () => {
    await expect(
      service.create('u1', 'slack', 'Slack Integration', [] as unknown as Record<string, unknown>, {})
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('sync throws ValidationError when integrationId is empty', async () => {
    await expect(service.sync('u1', '   ')).rejects.toBeInstanceOf(ValidationError);
  });

  it('sync throws NotFoundError when integration is missing', async () => {
    integrationHubRepo.touchSync.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(service.sync('u1', 'integration-missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sync returns normalized deterministic response', async () => {
    integrationHubRepo.touchSync.mockResolvedValue({
      rows: [
        {
          id: 'integration-abc',
          provider_slug: 'slack',
          display_name: 'Slack',
          last_sync_at: '2026-04-01T12:00:00.000Z',
        },
      ],
      rowCount: 1,
    });

    const first = await service.sync('u1', 'integration-abc');
    const second = await service.sync('u1', 'integration-abc');

    expect(first).toEqual(
      expect.objectContaining({
        id: 'integration-abc',
        provider_slug: 'slack',
        status: 'ok',
        operation: 'sync',
      })
    );
    expect(first.syncedRecords).toBe(second.syncedRecords);
    expect(typeof first.syncedAt).toBe('string');
    expect(integrationHubRepo.ensureShadowEcosystemForIntegration).toHaveBeenCalledWith(
      'integration-abc',
      'u1',
      'Slack',
      'slack',
    );
    expect(integrationHubRepo.createRun).not.toHaveBeenCalled();
  });

  describe('sync idempotency', () => {
    const row = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      provider_slug: 'slack',
      display_name: 'Slack',
      last_sync_at: '2026-04-01T12:00:00.000Z',
    };

    beforeEach(() => {
      integrationHubRepo.touchSync.mockResolvedValue({ rows: [row], rowCount: 1 });
    });

    it('uses lock and records run when key is set and no prior run exists', async () => {
      const result = await service.sync('u1', row.id, 'idem-1');

      expect(mockWithLock).toHaveBeenCalledWith(row.id, 'idem-1', expect.any(Function));
      expect(mockFindRecent).toHaveBeenCalledWith(row.id, 'idem-1');
      expect(integrationHubRepo.ensureShadowEcosystemForIntegration).toHaveBeenCalledWith(
        row.id,
        'u1',
        'Slack',
        'slack'
      );
      expect(integrationHubRepo.createRun).toHaveBeenCalledWith(
        row.id,
        'integration_hub_sync',
        expect.objectContaining({
          idempotency_key: 'idem-1',
          integration_id: row.id,
          operation: 'sync',
          response: expect.objectContaining({ id: row.id, operation: 'sync' }),
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: row.id, operation: 'sync' }));
    });

    it('returns stored response on replay without touching sync again', async () => {
      const storedResponse = { ...row, syncedRecords: 42, syncedAt: 't0', status: 'ok', operation: 'sync' };
      mockFindRecent.mockResolvedValueOnce({
        rows: [
          {
            id: 'prior-run',
            output_payload: {
              idempotency_key: 'idem-1',
              integration_id: row.id,
              operation: 'sync',
              response: storedResponse,
            },
          },
        ],
        rowCount: 1,
      });

      const result = await service.sync('u1', row.id, 'idem-1');

      expect(result).toBe(storedResponse);
      expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
      expect(integrationHubRepo.createRun).not.toHaveBeenCalled();
    });

    it('throws ConflictError when prior payload integration_id mismatches', async () => {
      mockFindRecent.mockResolvedValueOnce({
        rows: [
          {
            output_payload: {
              idempotency_key: 'idem-1',
              integration_id: 'other-id',
              operation: 'sync',
              response: {},
            },
          },
        ],
        rowCount: 1,
      });

      await expect(service.sync('u1', row.id, 'idem-1')).rejects.toBeInstanceOf(ConflictError);
      expect(integrationHubRepo.touchSync).not.toHaveBeenCalled();
    });

    it('trims idempotency key before lock and lookup', async () => {
      await service.sync('u1', row.id, '  spaced  ');

      expect(mockWithLock).toHaveBeenCalledWith(row.id, 'spaced', expect.any(Function));
      expect(mockFindRecent).toHaveBeenCalledWith(row.id, 'spaced');
    });
  });
});

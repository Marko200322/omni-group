import { Request, Response } from 'express';
import { IntegrationHubController } from '../../modules/integration-hub/controller/integration-hub.controller';
import { IntegrationHubService } from '../../modules/integration-hub/service/integration-hub.service';

jest.mock('../../modules/integration-hub/service/integration-hub.service');

const MockIntegrationHubService = IntegrationHubService as jest.MockedClass<
  typeof IntegrationHubService
>;

describe('IntegrationHubController', () => {
  let controller: IntegrationHubController;
  let mockService: jest.Mocked<IntegrationHubService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new IntegrationHubController();
    mockService = MockIntegrationHubService.mock.instances[0] as jest.Mocked<IntegrationHubService>;
  });

  const res = (): Response => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as Response;
  };

  const authed = (userId = 'u1'): Request =>
    ({
      user: { userId, role: 'user', email: 'a@b.com' },
      header: (_name: string) => undefined,
    }) as unknown as Request;

  it('create forwards body fields and userId', async () => {
    const row = { id: 'int-1' };
    mockService.create.mockResolvedValue(row as never);
    const r = res();
    const body = {
      providerSlug: 'slack',
      displayName: 'Slack',
      credentials: { token: 'x' },
      config: { channel: '#alerts' },
    };
    await controller.create({ ...authed('u12'), body } as Request, r);
    expect(mockService.create).toHaveBeenCalledWith('u12', 'slack', 'Slack', { token: 'x' }, {
      channel: '#alerts',
    });
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: row,
        message: 'Integration connected',
      })
    );
  });

  it('list passes userId', async () => {
    mockService.list.mockResolvedValue([{ id: 'i1' }] as never);
    const r = res();
    await controller.list(authed('u3'), r);
    expect(mockService.list).toHaveBeenCalledWith('u3');
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it('sync forwards userId and integrationId from body', async () => {
    const data = { id: 'int-abc', status: 'ok' };
    mockService.sync.mockResolvedValue(data as never);
    const r = res();
    await controller.sync({ ...authed(), body: { integrationId: 'int-abc' } } as Request, r);
    expect(mockService.sync).toHaveBeenCalledWith('u1', 'int-abc', undefined);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data,
        message: 'Integration sync completed',
      })
    );
  });

  it('sync forwards Idempotency-Key header when present', async () => {
    mockService.sync.mockResolvedValue({ id: 'int-abc' } as never);
    const r = res();
    const req = {
      ...authed(),
      body: { integrationId: '123e4567-e89b-12d3-a456-426614174000' },
      header: (name: string) => (name.toLowerCase() === 'idempotency-key' ? '  sync-key  ' : undefined),
    } as unknown as Request;
    await controller.sync(req, r);
    expect(mockService.sync).toHaveBeenCalledWith('u1', '123e4567-e89b-12d3-a456-426614174000', '  sync-key  ');
  });
});

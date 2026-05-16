import { ApiGatewayService } from '../../modules/api-gateway/service/api-gateway.service';
import { NotFoundError, ValidationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var apiGatewayRepo: {
  register: jest.Mock;
  list: jest.Mock;
  getByKey: jest.Mock;
};

jest.mock('../../modules/api-gateway/repository/api-gateway.repository', () => {
  apiGatewayRepo = {
    register: jest.fn().mockResolvedValue({ rows: [{ id: 'route-1' }], rowCount: 1 }),
    list: jest.fn().mockResolvedValue({ rows: [{ route_key: 'route-1' }], rowCount: 1 }),
    getByKey: jest.fn(),
  };
  return {
    ApiGatewayRepository: jest.fn().mockImplementation(() => apiGatewayRepo),
  };
});

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;

  beforeEach(() => {
    jest.clearAllMocks();
    apiGatewayRepo.register.mockReset();
    apiGatewayRepo.register.mockResolvedValue({ rows: [{ id: 'route-1' }], rowCount: 1 });
    apiGatewayRepo.list.mockReset();
    apiGatewayRepo.list.mockResolvedValue({ rows: [{ route_key: 'route-1' }], rowCount: 1 });
    apiGatewayRepo.getByKey.mockReset();
    service = new ApiGatewayService();
  });

  it('register normalizes method and validates route details', async () => {
    await service.register(' orders.sync ', 'integration-hub', '/sync', 'post', 120.9);
    expect(apiGatewayRepo.register).toHaveBeenCalledWith('orders.sync', 'integration-hub', '/sync', 'POST', 120);
  });

  it('register throws ValidationError for invalid path template', async () => {
    await expect(service.register('route-key', 'hub', 'sync', 'POST', 100)).rejects.toBeInstanceOf(ValidationError);
  });

  it('proxy throws NotFoundError when route does not exist', async () => {
    apiGatewayRepo.getByKey.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(service.proxy('missing-route', { source: 'test' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('proxy rejects malformed stored route contract', async () => {
    apiGatewayRepo.getByKey.mockResolvedValueOnce({
      rows: [{ route_key: 'rk', upstream_slug: '', path_template: '/x', method: 'POST' }],
      rowCount: 1,
    });
    await expect(service.proxy('rk', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('proxy returns normalized contract with compatibility fields', async () => {
    apiGatewayRepo.getByKey.mockResolvedValueOnce({
      rows: [
        {
          route_key: 'atina-forge-route',
          upstream_slug: 'forge',
          path_template: '/atina/forge/sync',
          method: 'post',
          rate_limit_per_minute: 300,
        },
      ],
      rowCount: 1,
    });

    const result = await service.proxy('atina-forge-route', { source: 'workflow-template' });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'ok',
        operation: 'proxy',
        routeKey: 'atina-forge-route',
        upstreamSlug: 'forge',
        dispatchedTo: 'forge:/atina/forge/sync',
        method: 'POST',
        payloadEcho: { source: 'workflow-template' },
      })
    );
    expect(result.route).toEqual(
      expect.objectContaining({
        routeKey: 'atina-forge-route',
        upstreamSlug: 'forge',
        pathTemplate: '/atina/forge/sync',
        method: 'POST',
        rateLimitPerMinute: 300,
      })
    );
    expect(typeof result.proxiedAt).toBe('string');
  });
});

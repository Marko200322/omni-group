import { ApiGatewayController } from '../../modules/api-gateway/controller/api-gateway.controller';

// eslint-disable-next-line no-var
var gwCtlMocks: { register: jest.Mock; list: jest.Mock; proxy: jest.Mock };

jest.mock('../../modules/api-gateway/service/api-gateway.service', () => {
  gwCtlMocks = {
    register: jest.fn().mockResolvedValue({ id: 'g1' }),
    list: jest.fn().mockResolvedValue([]),
    proxy: jest.fn().mockResolvedValue({ status: 'ok', operation: 'proxy' }),
  };
  return {
    ApiGatewayService: jest.fn().mockImplementation(() => gwCtlMocks),
  };
});

describe('ApiGatewayController', () => {
  let controller: ApiGatewayController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ApiGatewayController();
  });

  const res = () => {
    const json = jest.fn().mockReturnThis();
    return {
      status: jest.fn().mockReturnThis(),
      json,
    } as unknown as import('express').Response;
  };

  it('register forwards flattened body fields to service', async () => {
    const row = { id: 'route-1' };
    gwCtlMocks.register.mockResolvedValueOnce(row);
    const r = res();
    const body = {
      routeKey: 'orders-api',
      upstreamSlug: 'svc-orders',
      pathTemplate: '/v1/orders',
      method: 'POST',
      rateLimitPerMinute: 200,
    };
    await controller.register({ body } as import('express').Request, r);
    expect(gwCtlMocks.register).toHaveBeenCalledWith(
      'orders-api',
      'svc-orders',
      '/v1/orders',
      'POST',
      200
    );
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: row,
        message: 'Gateway route registered',
      })
    );
  });

  it('list returns rows from service', async () => {
    const rows = [{ routeKey: 'k' }];
    gwCtlMocks.list.mockResolvedValueOnce(rows);
    const r = res();
    await controller.list({} as import('express').Request, r);
    expect(gwCtlMocks.list).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: rows, message: expect.any(String) })
    );
  });

  it('proxy forwards routeKey and payload', async () => {
    const data = { status: 'ok', routeKey: 'rk' };
    gwCtlMocks.proxy.mockResolvedValueOnce(data);
    const r = res();
    const body = { routeKey: 'my-route-key', payload: { a: 1 } };
    await controller.proxy({ body } as import('express').Request, r);
    expect(gwCtlMocks.proxy).toHaveBeenCalledWith('my-route-key', { a: 1 });
    expect(r.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data, message: 'Route proxied' })
    );
  });
});

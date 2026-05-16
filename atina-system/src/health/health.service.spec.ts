import { HealthService } from './health.service';

describe('HealthService', () => {
  const prevRedisHost = process.env.REDIS_HOST;
  const prevRedisPort = process.env.REDIS_PORT;

  afterEach(() => {
    if (prevRedisHost === undefined) {
      delete process.env.REDIS_HOST;
    } else {
      process.env.REDIS_HOST = prevRedisHost;
    }
    if (prevRedisPort === undefined) {
      delete process.env.REDIS_PORT;
    } else {
      process.env.REDIS_PORT = prevRedisPort;
    }
  });

  it('reports redis not configured when REDIS_HOST unset', async () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    const svc = new HealthService();
    const body = await svc.buildHealthResponse();
    expect(body.ok).toBe(true);
    expect(body.redis).toEqual({ configured: false });
    expect(body.bull).toEqual({ enabled: false, queues: [] });
  });
});

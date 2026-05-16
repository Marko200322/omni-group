import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  async buildHealthResponse(): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      ok: true,
      name: 'atina-system',
      ts: new Date().toISOString(),
      blueprint: 'Titan_System_Ultimate_Node_Blueprint (Atina implementacija)',
    };

    const host = process.env.REDIS_HOST?.trim();
    if (!host) {
      payload.redis = { configured: false };
      payload.bull = { enabled: false, queues: [] };
      return payload;
    }

    payload.bull = { enabled: true, queues: ['system'] };

    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const redis = new Redis({
      host,
      port,
      connectTimeout: 1500,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => undefined,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      payload.redis = { configured: true, reachable: pong === 'PONG' };
    } catch (err) {
      this.logger.warn(`Redis health check failed: ${(err as Error).message}`);
      payload.redis = { configured: true, reachable: false };
    } finally {
      try {
        await redis.quit();
      } catch {
        redis.disconnect();
      }
    }

    return payload;
  }
}

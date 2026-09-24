import { createClient } from 'redis';
import { config } from '../config';
import logger from '../utils/logger';

let inFlightProbe: Promise<boolean> | null = null;
let lastProbeAt = 0;
let lastProbeResult = false;
const CACHE_MS = 5000;

async function runRedisProbe(): Promise<boolean> {
  const client = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      connectTimeout: 2000,
      reconnectStrategy: false,
    },
    password: config.redis.password || undefined,
    database: config.redis.db,
  });

  client.on('error', () => {
    // The probe reports failure through its return value; avoid duplicate noisy logs.
  });

  try {
    await client.connect();
    return (await client.ping()) === 'PONG';
  } catch (error) {
    logger.warn('Redis health probe failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    if (client.isOpen) {
      await client.quit().catch(() => client.disconnect());
    }
  }
}

/** Short Redis readiness probe, coalesced and cached against public health-check bursts. */
export async function testRedisConnection(): Promise<boolean> {
  const now = Date.now();
  if (config.app.env !== 'test' && now - lastProbeAt < CACHE_MS) {
    return lastProbeResult;
  }
  if (inFlightProbe) return inFlightProbe;

  inFlightProbe = runRedisProbe();
  try {
    lastProbeResult = await inFlightProbe;
    lastProbeAt = Date.now();
    return lastProbeResult;
  } finally {
    inFlightProbe = null;
  }
}

import { createClient, type RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { config } from '../../config';
import logger from '../../utils/logger';
import { getOmiUsageConfig, type OmiBudgetCeiling } from './omi-usage-config';

export type OmiUsageEventKind =
  | 'request'
  | 'ai_success'
  | 'ai_fail'
  | 'blocked'
  | 'downgrade'
  | 'fallback';

export type OmiUsageEvent = {
  at: string;
  kind: OmiUsageEventKind;
  reason?: string;
  modelTier?: OmiBudgetCeiling;
  model?: string;
  sessionId?: string;
  audience?: 'public' | 'portal';
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  success?: boolean;
};

export type OmiUsageDashboard = {
  storeReady: boolean;
  failClosed: boolean;
  budget: {
    dailyBudgetUsd: number;
    monthlyBudgetUsd: number;
    reservePercent: number;
    dailySpendableUsd: number;
    monthlySpendableUsd: number;
    dailySpentUsd: number;
    monthlySpentUsd: number;
    dailyPct: number;
    monthlyPct: number;
    aiAllowed: boolean;
  };
  requests: {
    today: number;
    month: number;
    blockedToday: number;
    blockedMonth: number;
  };
  costByModel: Array<{ model: string; costUsd: number; requests: number }>;
  topSessions: Array<{ sessionId: string; requests: number; costUsd: number }>;
  recentBlocked: OmiUsageEvent[];
  recentEvents: OmiUsageEvent[];
};

type CounterBucket = 'day' | 'hour' | 'minute' | 'month';

function utcStamp(bucket: CounterBucket, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  if (bucket === 'month') return `${y}${m}`;
  if (bucket === 'day') return `${y}${m}${day}`;
  if (bucket === 'hour') return `${y}${m}${day}${h}`;
  return `${y}${m}${day}${h}${min}`;
}

function ttlFor(bucket: CounterBucket): number {
  if (bucket === 'minute') return 120;
  if (bucket === 'hour') return 2 * 3600;
  if (bucket === 'day') return 2 * 86400;
  return 40 * 86400;
}

function hashDedupe(sessionId: string, message: string): string {
  return createHash('sha256').update(`${sessionId}|${message.trim().toLowerCase()}`).digest('hex').slice(0, 32);
}

export interface OmiUsageStore {
  /** false when spend tracking is unavailable — callers must fail-closed for AI. */
  isReady(): boolean;
  /** Connect / probe if needed. Prefer this before reading isReady() on cold start. */
  ensureReady(): Promise<boolean>;
  incr(key: string, by?: number, ttlSec?: number): Promise<number>;
  get(key: string): Promise<number>;
  setNx(key: string, ttlMs: number): Promise<boolean>;
  pushEvent(event: OmiUsageEvent): Promise<void>;
  listEvents(limit?: number): Promise<OmiUsageEvent[]>;
  hincr(hashKey: string, field: string, by: number, ttlSec?: number): Promise<number>;
  hgetall(hashKey: string): Promise<Record<string, string>>;
  zincr(key: string, member: string, by: number, ttlSec?: number): Promise<void>;
  ztop(key: string, limit: number): Promise<Array<{ member: string; score: number }>>;
}

/** In-memory store for unit tests only. Production AI spend requires Redis. */
export class MemoryOmiUsageStore implements OmiUsageStore {
  private readonly counters = new Map<string, number>();
  private readonly hashes = new Map<string, Map<string, number>>();
  private readonly zsets = new Map<string, Map<string, number>>();
  private readonly locks = new Map<string, number>();
  private events: OmiUsageEvent[] = [];
  private ready: boolean;

  constructor(ready = true) {
    this.ready = ready;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isReady(): boolean {
    return this.ready;
  }

  async ensureReady(): Promise<boolean> {
    return this.ready;
  }

  async incr(key: string, by = 1, _ttlSec?: number): Promise<number> {
    const next = (this.counters.get(key) ?? 0) + by;
    this.counters.set(key, next);
    return next;
  }

  async get(key: string): Promise<number> {
    return this.counters.get(key) ?? 0;
  }

  async setNx(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const until = this.locks.get(key) ?? 0;
    if (until > now) return false;
    this.locks.set(key, now + ttlMs);
    return true;
  }

  async pushEvent(event: OmiUsageEvent): Promise<void> {
    this.events.unshift(event);
    if (this.events.length > 200) this.events = this.events.slice(0, 200);
  }

  async listEvents(limit = 50): Promise<OmiUsageEvent[]> {
    return this.events.slice(0, limit);
  }

  async hincr(hashKey: string, field: string, by: number, _ttlSec?: number): Promise<number> {
    let map = this.hashes.get(hashKey);
    if (!map) {
      map = new Map();
      this.hashes.set(hashKey, map);
    }
    const next = (map.get(field) ?? 0) + by;
    map.set(field, next);
    return next;
  }

  async hgetall(hashKey: string): Promise<Record<string, string>> {
    const map = this.hashes.get(hashKey);
    if (!map) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of map) out[k] = String(v);
    return out;
  }

  async zincr(key: string, member: string, by: number, _ttlSec?: number): Promise<void> {
    let map = this.zsets.get(key);
    if (!map) {
      map = new Map();
      this.zsets.set(key, map);
    }
    map.set(member, (map.get(member) ?? 0) + by);
  }

  async ztop(key: string, limit: number): Promise<Array<{ member: string; score: number }>> {
    const map = this.zsets.get(key);
    if (!map) return [];
    return [...map.entries()]
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export class RedisOmiUsageStore implements OmiUsageStore {
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType | null> | null = null;
  private ready = false;
  private lastErrorAt = 0;

  isReady(): boolean {
    return this.ready && Boolean(this.client?.isOpen);
  }

  async ensureReady(): Promise<boolean> {
    await this.ensureClient();
    return this.isReady();
  }

  private async ensureClient(): Promise<RedisClientType | null> {
    if (this.client?.isOpen) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      try {
        const client = createClient({
          socket: {
            host: config.redis.host,
            port: config.redis.port,
            connectTimeout: 2000,
            reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
          },
          password: config.redis.password || undefined,
          database: config.redis.db,
        }) as RedisClientType;

        client.on('error', (err) => {
          this.ready = false;
          const now = Date.now();
          if (now - this.lastErrorAt > 30_000) {
            this.lastErrorAt = now;
            logger.warn('OMI usage Redis error', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        });

        await client.connect();
        this.client = client;
        this.ready = true;
        return client;
      } catch (err) {
        this.ready = false;
        logger.warn('OMI usage Redis unavailable — AI spend fail-closed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  private async withClient<T>(fn: (c: RedisClientType) => Promise<T>): Promise<T> {
    const client = await this.ensureClient();
    if (!client?.isOpen) {
      this.ready = false;
      throw new Error('OMI_USAGE_STORE_UNAVAILABLE');
    }
    return fn(client);
  }

  async incr(key: string, by = 1, ttlSec?: number): Promise<number> {
    return this.withClient(async (c) => {
      const n = await c.incrBy(key, by);
      if (ttlSec && n === by) await c.expire(key, ttlSec);
      return n;
    });
  }

  async get(key: string): Promise<number> {
    return this.withClient(async (c) => {
      const raw = await c.get(key);
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    });
  }

  async setNx(key: string, ttlMs: number): Promise<boolean> {
    return this.withClient(async (c) => {
      const result = await c.set(key, '1', { NX: true, PX: ttlMs });
      return result === 'OK';
    });
  }

  async pushEvent(event: OmiUsageEvent): Promise<void> {
    await this.withClient(async (c) => {
      const key = 'omi:usage:events';
      await c.lPush(key, JSON.stringify(event));
      await c.lTrim(key, 0, 199);
      await c.expire(key, 40 * 86400);
    });
  }

  async listEvents(limit = 50): Promise<OmiUsageEvent[]> {
    return this.withClient(async (c) => {
      const rows = await c.lRange('omi:usage:events', 0, Math.max(0, limit - 1));
      return rows
        .map((row) => {
          try {
            return JSON.parse(row) as OmiUsageEvent;
          } catch {
            return null;
          }
        })
        .filter((e): e is OmiUsageEvent => Boolean(e));
    });
  }

  async hincr(hashKey: string, field: string, by: number, ttlSec?: number): Promise<number> {
    return this.withClient(async (c) => {
      const n = await c.hIncrBy(hashKey, field, by);
      if (ttlSec) await c.expire(hashKey, ttlSec);
      return n;
    });
  }

  async hgetall(hashKey: string): Promise<Record<string, string>> {
    return this.withClient(async (c) => c.hGetAll(hashKey));
  }

  async zincr(key: string, member: string, by: number, ttlSec?: number): Promise<void> {
    await this.withClient(async (c) => {
      await c.zIncrBy(key, by, member);
      if (ttlSec) await c.expire(key, ttlSec);
    });
  }

  async ztop(key: string, limit: number): Promise<Array<{ member: string; score: number }>> {
    return this.withClient(async (c) => {
      const rows = await c.zRangeWithScores(key, 0, Math.max(0, limit - 1), { REV: true });
      return rows.map((r) => ({ member: r.value, score: r.score }));
    });
  }
}

let defaultStore: OmiUsageStore | null = null;

export function getOmiUsageStore(): OmiUsageStore {
  if (!defaultStore) {
    // Unit tests use injectable memory stores; production uses Redis (fail-closed).
    if (config.app.env === 'test' || process.env.OMI_USAGE_STORE === 'memory') {
      defaultStore = new MemoryOmiUsageStore(true);
    } else {
      defaultStore = new RedisOmiUsageStore();
      // Warm the Redis connection so the first admit/admin call is not stuck on cold isReady=false.
      void defaultStore.ensureReady();
    }
  }
  return defaultStore;
}

export function setOmiUsageStoreForTests(store: OmiUsageStore | null): void {
  defaultStore = store;
}

export function counterKey(parts: string[]): string {
  return `omi:usage:${parts.join(':')}`;
}

export async function recordSpendUsd(store: OmiUsageStore, costUsd: number): Promise<void> {
  if (costUsd <= 0) return;
  // Store micros to avoid float drift in Redis integers.
  const micros = Math.round(costUsd * 1_000_000);
  const day = utcStamp('day');
  const month = utcStamp('month');
  await store.incr(counterKey(['spend', 'day', day]), micros, ttlFor('day'));
  await store.incr(counterKey(['spend', 'month', month]), micros, ttlFor('month'));
}

export async function getSpendUsd(store: OmiUsageStore): Promise<{ daily: number; monthly: number }> {
  const day = utcStamp('day');
  const month = utcStamp('month');
  const [d, m] = await Promise.all([
    store.get(counterKey(['spend', 'day', day])),
    store.get(counterKey(['spend', 'month', month])),
  ]);
  return { daily: d / 1_000_000, monthly: m / 1_000_000 };
}

export async function tryAcquireConcurrency(store: OmiUsageStore, slotKey: string): Promise<boolean> {
  const cfg = getOmiUsageConfig();
  const key = counterKey(['conc', slotKey, utcStamp('minute')]);
  const n = await store.incr(key, 1, ttlFor('minute'));
  return n <= cfg.maxConcurrency;
}

export async function releaseConcurrency(store: OmiUsageStore, slotKey: string): Promise<void> {
  const key = counterKey(['conc', slotKey, utcStamp('minute')]);
  try {
    await store.incr(key, -1, ttlFor('minute'));
  } catch {
    /* ignore */
  }
}

export async function isDuplicateMessage(
  store: OmiUsageStore,
  sessionId: string,
  message: string,
): Promise<boolean> {
  const cfg = getOmiUsageConfig();
  const key = counterKey(['dedupe', hashDedupe(sessionId, message)]);
  const acquired = await store.setNx(key, cfg.dedupeWindowMs);
  return !acquired;
}

export { utcStamp, ttlFor };

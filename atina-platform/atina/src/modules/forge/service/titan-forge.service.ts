import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import logger from '../../../utils/logger';
import { PaymentError } from '../../../utils/errors';
import { config, resolveForgeVaultPath } from '../../../config';

type Provider = 'oracle' | 'aws' | 'azure';

export type ForgeRunSummary = {
  provider: Provider;
  costRsd: number;
  remainingBudgetRsd: number;
  resourceId: string;
  eventId: string;
};

type ForgeBudgetGuard = {
  minReserveRsd: number;
  hardStopMode: boolean;
};

type ForgeStatus = {
  providers: Provider[];
  nextProvider: Provider;
  budgetRsd: {
    initial: number;
    remaining: number;
    spent: number;
  };
  budgetGuard: ForgeBudgetGuard & {
    availableToSpendRsd: number;
  };
  recentEvents: Array<{
    id: string;
    provider: Provider;
    eventType: string;
    costRsd: number;
    createdAt: string;
  }>;
};

export class TitanForgeService {
  private readonly providers: Provider[] = ['oracle', 'aws', 'azure'];
  private readonly dbPath: string;
  private readonly maxWriteRetries = 3;
  private readonly baseBackoffMs = 50;
  private readonly maxBackoffMs = 400;
  private readonly budgetGuard: ForgeBudgetGuard;

  constructor(dbPath?: string, budgetGuard?: ForgeBudgetGuard) {
    this.dbPath = typeof dbPath === 'undefined' ? config.forge.vaultPath : resolveForgeVaultPath(dbPath);
    this.budgetGuard = {
      minReserveRsd: Math.max(0, Number(budgetGuard?.minReserveRsd ?? config.forge.minReserveRsd ?? 0)),
      hardStopMode: Boolean(budgetGuard?.hardStopMode ?? config.forge.hardStopMode),
    };
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  getVaultPath(): string {
    return this.dbPath;
  }

  private openDb(): sqlite3.Database {
    return new sqlite3.Database(this.dbPath);
  }

  private run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private isTransientSqliteWriteError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const code = String((err as { code?: unknown }).code ?? '');
    const message = String((err as { message?: unknown }).message ?? '').toLowerCase();
    if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
      return true;
    }
    return (
      message.includes('database is locked') ||
      message.includes('database schema is locked') ||
      message.includes('busy')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async runWriteWithRetry(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
    let attempt = 0;
    while (attempt <= this.maxWriteRetries) {
      try {
        await this.run(db, sql, params);
        return;
      } catch (err) {
        const transient = this.isTransientSqliteWriteError(err);
        if (!transient || attempt >= this.maxWriteRetries) {
          logger.warn('SQLite write failed in TitanForgeService', {
            attempt: attempt + 1,
            maxRetries: this.maxWriteRetries,
            transient,
            code: (err as { code?: string })?.code,
            error: (err as Error)?.message,
          });
          throw err;
        }

        const delayMs = Math.min(this.maxBackoffMs, this.baseBackoffMs * Math.pow(2, attempt));
        logger.warn('Transient SQLite write error in TitanForgeService, retrying', {
          attempt: attempt + 1,
          maxRetries: this.maxWriteRetries,
          delayMs,
          code: (err as { code?: string })?.code,
          error: (err as Error)?.message,
        });
        attempt += 1;
        await this.sleep(delayMs);
      }
    }
    throw new Error('Unreachable retry state in TitanForgeService');
  }

  private all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  private get<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  private async ensureSchema(db: sqlite3.Database): Promise<void> {
    await this.runWriteWithRetry(
      db,
      `CREATE TABLE IF NOT EXISTS forge_budget (
         id TEXT PRIMARY KEY,
         initial_rsd INTEGER NOT NULL,
         remaining_rsd INTEGER NOT NULL,
         updated_at TEXT NOT NULL
       )`
    );
    await this.runWriteWithRetry(
      db,
      `CREATE TABLE IF NOT EXISTS forge_resources (
         id TEXT PRIMARY KEY,
         provider TEXT NOT NULL,
         resource_type TEXT NOT NULL,
         status TEXT NOT NULL,
         metadata_json TEXT NOT NULL,
         created_at TEXT NOT NULL
       )`
    );
    await this.runWriteWithRetry(
      db,
      `CREATE TABLE IF NOT EXISTS forge_events (
         id TEXT PRIMARY KEY,
         provider TEXT NOT NULL,
         event_type TEXT NOT NULL,
         cost_rsd INTEGER NOT NULL,
         payload_json TEXT NOT NULL,
         created_at TEXT NOT NULL
       )`
    );
    const budget = await this.get<{ id: string }>(db, `SELECT id FROM forge_budget WHERE id = 'main' LIMIT 1`);
    if (!budget) {
      await this.runWriteWithRetry(
        db,
        `INSERT INTO forge_budget (id, initial_rsd, remaining_rsd, updated_at)
         VALUES ('main', 4000, 4000, ?)`,
        [new Date().toISOString()]
      );
    }
  }

  private providerCost(mode: string, intensity: number, provider: Provider): number {
    const base = mode === 'deploy' ? 170 : mode === 'temper' ? 120 : 80;
    const providerFactor = provider === 'oracle' ? 1 : provider === 'aws' ? 1.2 : 1.15;
    return Math.max(20, Math.round(base * (intensity / 25) * providerFactor));
  }

  private nextProviderFromIndex(index: number): Provider {
    return this.providers[index % this.providers.length];
  }

  async forge(mode: string, intensity: number): Promise<ForgeRunSummary> {
    const db = this.openDb();
    try {
      await this.ensureSchema(db);
      const countRow = await this.get<{ count: number }>(db, `SELECT COUNT(*) AS count FROM forge_events`);
      const nextProvider = this.nextProviderFromIndex(Number(countRow?.count ?? 0));
      const costRsd = this.providerCost(mode, intensity, nextProvider);
      const budget = await this.get<{ initial_rsd: number; remaining_rsd: number }>(
        db,
        `SELECT initial_rsd, remaining_rsd FROM forge_budget WHERE id = 'main' LIMIT 1`
      );
      const remaining = Number(budget?.remaining_rsd ?? 0);
      const availableToSpend = this.budgetGuard.hardStopMode
        ? Math.max(0, remaining - this.budgetGuard.minReserveRsd)
        : remaining;
      if (remaining < costRsd) {
        throw new PaymentError(`Forge budget exceeded. Remaining ${remaining} RSD, required ${costRsd} RSD.`);
      }
      if (this.budgetGuard.hardStopMode && costRsd > availableToSpend) {
        throw new PaymentError(
          `Forge reserve guard blocked spend. Available to spend ${availableToSpend} RSD after reserve ${this.budgetGuard.minReserveRsd} RSD, required ${costRsd} RSD.`
        );
      }
      const now = new Date().toISOString();
      const resourceId = `res_${Date.now()}`;
      const eventId = `evt_${Date.now()}`;
      await this.runWriteWithRetry(
        db,
        `INSERT INTO forge_resources (id, provider, resource_type, status, metadata_json, created_at)
         VALUES (?, ?, ?, 'ready', ?, ?)`,
        [
          resourceId,
          nextProvider,
          `high-value-${mode}`,
          JSON.stringify({ mode, intensity, origin: 'titan-forge' }),
          now,
        ]
      );
      await this.runWriteWithRetry(
        db,
        `INSERT INTO forge_events (id, provider, event_type, cost_rsd, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          nextProvider,
          `forge_${mode}`,
          costRsd,
          JSON.stringify({ resourceId, mode, intensity }),
          now,
        ]
      );
      await this.runWriteWithRetry(
        db,
        `UPDATE forge_budget
         SET remaining_rsd = remaining_rsd - ?,
             updated_at = ?
         WHERE id = 'main'`,
        [costRsd, now]
      );
      const updated = await this.get<{ remaining_rsd: number }>(
        db,
        `SELECT remaining_rsd FROM forge_budget WHERE id = 'main' LIMIT 1`
      );
      return {
        provider: nextProvider,
        costRsd,
        remainingBudgetRsd: Number(updated?.remaining_rsd ?? 0),
        resourceId,
        eventId,
      };
    } finally {
      db.close();
    }
  }

  async getStatus(): Promise<ForgeStatus> {
    const db = this.openDb();
    try {
      await this.ensureSchema(db);
      const budget = await this.get<{ initial_rsd: number; remaining_rsd: number }>(
        db,
        `SELECT initial_rsd, remaining_rsd FROM forge_budget WHERE id = 'main' LIMIT 1`
      );
      const events = await this.all<{
        id: string;
        provider: Provider;
        event_type: string;
        cost_rsd: number;
        created_at: string;
      }>(
        db,
        `SELECT id, provider, event_type, cost_rsd, created_at
         FROM forge_events
         ORDER BY created_at DESC, id DESC
         LIMIT 20`
      );
      const countRow = await this.get<{ count: number }>(db, `SELECT COUNT(*) AS count FROM forge_events`);
      const nextProvider = this.nextProviderFromIndex(Number(countRow?.count ?? 0));
      const initial = Number(budget?.initial_rsd ?? 4000);
      const remaining = Number(budget?.remaining_rsd ?? 4000);
      const availableToSpendRsd = Math.max(0, remaining - this.budgetGuard.minReserveRsd);
      return {
        providers: [...this.providers],
        nextProvider,
        budgetRsd: {
          initial,
          remaining,
          spent: Math.max(0, initial - remaining),
        },
        budgetGuard: {
          minReserveRsd: this.budgetGuard.minReserveRsd,
          hardStopMode: this.budgetGuard.hardStopMode,
          availableToSpendRsd,
        },
        recentEvents: events.map((e) => ({
          id: e.id,
          provider: e.provider,
          eventType: e.event_type,
          costRsd: Number(e.cost_rsd),
          createdAt: e.created_at,
        })),
      };
    } finally {
      db.close();
    }
  }
}


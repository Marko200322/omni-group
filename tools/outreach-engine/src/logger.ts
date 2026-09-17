/**
 * Audit logger — SQLite when better-sqlite3 is available, else JSONL fallback.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  AuditEventSchema,
  type AuditEvent,
  type GuardrailResult,
} from './types.js';
import { stripSecretsFromObject } from './security-config.js';

export type LoggerOptions = {
  dbPath: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
};

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;

type SqlDb = {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => {
    run: (params: Record<string, unknown>) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  close: () => void;
};

function tryOpenSqlite(dbPath: string): SqlDb | null {
  try {
    // Optional dependency — JSONL fallback if native module missing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as new (path: string) => SqlDb;
    return new Database(dbPath);
  } catch {
    return null;
  }
}

export class OutreachAuditLogger {
  private readonly db: SqlDb | null;
  private readonly jsonlPath: string;
  private readonly level: keyof typeof LEVEL_ORDER;

  constructor(opts: LoggerOptions) {
    mkdirSync(dirname(opts.dbPath), { recursive: true });
    this.level = opts.level ?? 'info';
    this.jsonlPath = opts.dbPath.replace(/\.sqlite$/i, '') + '.jsonl';
    this.db = tryOpenSqlite(opts.dbPath);
    if (this.db) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS outreach_audit (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          lead_id TEXT NOT NULL,
          stage TEXT NOT NULL,
          relevance_score REAL,
          package_id TEXT,
          supervisor_status TEXT,
          factuality_score REAL,
          outbound_channel TEXT,
          payload_json TEXT,
          error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach_audit(lead_id);
        CREATE INDEX IF NOT EXISTS idx_outreach_stage ON outreach_audit(stage);
        CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_audit(created_at);
      `);
    }
  }

  private shouldLog(level: keyof typeof LEVEL_ORDER): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  logConsole(level: keyof typeof LEVEL_ORDER, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return;
    const line = `[outreach:${level}] ${message}`;
    if (level === 'error') console.error(line, meta ?? '');
    else if (level === 'warn') console.warn(line, meta ?? '');
    else console.log(line, meta ?? '');
  }

  record(
    partial: Omit<AuditEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ): AuditEvent {
    const event = AuditEventSchema.parse({
      id: partial.id ?? randomUUID(),
      createdAt: partial.createdAt ?? new Date().toISOString(),
      ...partial,
      payloadSummary: partial.payloadSummary
        ? stripSecretsFromObject(partial.payloadSummary as Record<string, unknown>)
        : undefined,
    });

    if (this.db) {
      this.db
        .prepare(
          `INSERT INTO outreach_audit (
            id, created_at, lead_id, stage, relevance_score, package_id,
            supervisor_status, factuality_score, outbound_channel, payload_json, error
          ) VALUES (
            @id, @created_at, @lead_id, @stage, @relevance_score, @package_id,
            @supervisor_status, @factuality_score, @outbound_channel, @payload_json, @error
          )`,
        )
        .run({
          id: event.id,
          created_at: event.createdAt,
          lead_id: event.leadId,
          stage: event.stage,
          relevance_score: event.relevanceScore ?? null,
          package_id: event.packageId ?? null,
          supervisor_status: event.supervisorStatus ?? null,
          factuality_score: event.factualityScore ?? null,
          outbound_channel: event.outboundChannel ?? null,
          payload_json: event.payloadSummary ? JSON.stringify(event.payloadSummary) : null,
          error: event.error ?? null,
        });
    } else {
      appendFileSync(this.jsonlPath, `${JSON.stringify(event)}\n`, 'utf8');
    }

    this.logConsole('info', `${event.stage} lead=${event.leadId}`, {
      status: event.supervisorStatus,
      factuality: event.factualityScore,
    });
    return event;
  }

  recordGuardrail(
    leadId: string,
    result: GuardrailResult,
    packageId?: string | null,
  ): AuditEvent {
    return this.record({
      leadId,
      stage: result.ok ? 'guardrail' : 'rejected',
      packageId: packageId ?? null,
      supervisorStatus: result.status,
      factualityScore: result.factualityScore,
      outboundChannel: 'none',
      payloadSummary: {
        findings: result.findings,
        checkout: result.approvedCheckoutUrl,
        messageHash: result.finalMessage
          ? createHash('sha256').update(result.finalMessage).digest('hex').slice(0, 16)
          : null,
      },
    });
  }

  listRecent(limit = 50): AuditEvent[] {
    if (this.db) {
      const rows = this.db
        .prepare(`SELECT * FROM outreach_audit ORDER BY created_at DESC LIMIT ?`)
        .all(limit) as Array<Record<string, unknown>>;
      return rows.map((r) =>
        AuditEventSchema.parse({
          id: r.id,
          createdAt: r.created_at,
          leadId: r.lead_id,
          stage: r.stage,
          relevanceScore: r.relevance_score ?? undefined,
          packageId: r.package_id ?? null,
          supervisorStatus: r.supervisor_status ?? undefined,
          factualityScore: r.factuality_score ?? undefined,
          outboundChannel: r.outbound_channel ?? undefined,
          payloadSummary: r.payload_json
            ? (JSON.parse(String(r.payload_json)) as Record<string, unknown>)
            : undefined,
          error: r.error ? String(r.error) : undefined,
        }),
      );
    }
    if (!existsSync(this.jsonlPath)) return [];
    const lines = readFileSync(this.jsonlPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((line) => AuditEventSchema.parse(JSON.parse(line)));
  }

  close(): void {
    this.db?.close();
  }
}

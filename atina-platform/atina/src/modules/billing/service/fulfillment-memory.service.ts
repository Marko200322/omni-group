import { AiMemoryRepository } from '../../ai-memory/repository/ai-memory.repository';
import { AiMemoryService } from '../../ai-memory/service/ai-memory.service';
import { config } from '../../../config';
import type { FulfillmentResult } from '../lib/deliverable-handlers/types';
import type { FulfillmentChecklistResult } from '../lib/fulfillment-quality-checklist';
import logger from '../../../utils/logger';

const NAMESPACE = 'fulfillment';

export type FulfillmentMemoryRecord = {
  deliverableId: string;
  industryCategory?: string | null;
  paymentId: string;
  publicUrl?: string | null;
  artifactTypes: string[];
  checklistScore?: number;
  approvedAt: string;
  notes?: string;
};

function escapeLikeFragment(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

function parseMemoryContext(raw: unknown): FulfillmentMemoryRecord | null {
  let ctx = raw;
  if (typeof ctx === 'string') {
    try {
      ctx = JSON.parse(ctx) as unknown;
    } catch {
      return null;
    }
  }
  if (!ctx || typeof ctx !== 'object') return null;
  const record = ctx as FulfillmentMemoryRecord;
  if (!record.deliverableId) return null;
  return record;
}

function recordToHint(record: FulfillmentMemoryRecord): string {
  const parts = [
    record.industryCategory ? `Industry: ${record.industryCategory}` : null,
    record.publicUrl ? `Site: ${record.publicUrl}` : null,
    record.artifactTypes.length ? `Artifacts: ${record.artifactTypes.join(', ')}` : null,
    record.checklistScore != null ? `Checklist score: ${record.checklistScore}%` : null,
    record.notes?.trim() ? `Notes: ${record.notes.trim()}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export class FulfillmentMemoryService {
  private readonly memory = new AiMemoryService();
  private readonly repo = new AiMemoryRepository();

  isEnabled(): boolean {
    return config.deliverableFulfillment.learningLoopEnabled;
  }

  private namespace(): string {
    return config.deliverableFulfillment.memoryNamespace.trim() || NAMESPACE;
  }

  async recallHints(userId: string, deliverableId: string): Promise<string[]> {
    if (!this.isEnabled()) return [];

    const ns = this.namespace();
    const likePattern = `memory:${escapeLikeFragment(ns)}:${escapeLikeFragment(deliverableId)}%`;
    const hints: string[] = [];

    try {
      const { rows: platformRows } = await this.repo.recallPlatformByMessageLike(likePattern, 8);
      for (const row of platformRows) {
        const record = parseMemoryContext(row.context);
        if (!record || record.deliverableId !== deliverableId) continue;
        const hint = recordToHint(record);
        if (hint) hints.push(hint);
      }

      if (hints.length < 3) {
        const localRows = await this.memory.recall(userId, { namespace: ns, key: deliverableId });
        const rows = Array.isArray(localRows)
          ? localRows
          : ((localRows as { local?: typeof platformRows }).local ?? []);
        for (const row of rows) {
          const record = parseMemoryContext((row as { context?: unknown }).context);
          if (!record || record.deliverableId !== deliverableId) continue;
          const hint = recordToHint(record);
          if (hint && !hints.includes(hint)) hints.push(hint);
        }
      }

      return hints.slice(0, 5);
    } catch (err) {
      logger.warn('Fulfillment memory recall skipped', {
        deliverableId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  async rememberSuccess(input: {
    userId: string;
    deliverableId: string;
    industryCategory?: string | null;
    paymentId: string;
    result: FulfillmentResult;
    checklist?: FulfillmentChecklistResult;
    notes?: string;
  }): Promise<void> {
    if (!this.isEnabled()) return;

    const record: FulfillmentMemoryRecord = {
      deliverableId: input.deliverableId,
      industryCategory: input.industryCategory ?? null,
      paymentId: input.paymentId,
      publicUrl: input.result.publicUrl ?? null,
      artifactTypes: input.result.artifacts.map((a) => a.type),
      checklistScore: input.checklist?.score,
      approvedAt: new Date().toISOString(),
      notes: input.notes,
    };

    try {
      await this.memory.remember(input.userId, {
        namespace: this.namespace(),
        key: `${input.deliverableId}:${input.paymentId.slice(0, 8)}`,
        value: record as unknown as Record<string, unknown>,
      });
    } catch (err) {
      logger.warn('Fulfillment memory remember skipped', {
        paymentId: input.paymentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

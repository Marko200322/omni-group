import fs from 'fs';
import path from 'path';
import { NotFoundError, AuthorizationError } from '../../../utils/errors';
import { DeliverableFulfillmentRepository, type FulfillmentJobRow } from '../repository/deliverable-fulfillment.repository';
import type { FulfillmentChecklistResult } from '../lib/fulfillment-quality-checklist';

export type FulfillmentArtifactView = {
  type: string;
  filename: string;
  downloadLabel?: string;
};

export type FulfillmentJobView = {
  id: string;
  paymentId: string;
  deliverableId: string | null;
  planSlug: string | null;
  purchaseType: FulfillmentJobRow['purchase_type'];
  status: FulfillmentJobRow['status'];
  reviewStatus: FulfillmentJobRow['review_status'];
  reviewNotes: string | null;
  releasedAt: string | null;
  error: string | null;
  publicUrl: string | null;
  projectId: string | null;
  artifacts: FulfillmentArtifactView[];
  clientVisible: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Admin views only — automated quality gate result stored with the job. */
  qualityChecklist?: (FulfillmentChecklistResult & { attemptNumber: number }) | null;
};

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin' || role === 'operator';
}

function readQualityChecklist(result: Record<string, unknown>): FulfillmentJobView['qualityChecklist'] {
  const meta = result.fulfillmentMeta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const checklist = (meta as Record<string, unknown>).checklist;
  if (!checklist || typeof checklist !== 'object' || Array.isArray(checklist)) return null;
  const c = checklist as Record<string, unknown>;
  const items = Array.isArray(c.items)
    ? c.items
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
        .map((i) => ({
          id: String(i.id ?? ''),
          passed: i.passed === true,
          message: typeof i.message === 'string' ? i.message : '',
        }))
    : [];
  return {
    passed: c.passed === true,
    score: Number.isFinite(Number(c.score)) ? Number(c.score) : 0,
    items,
    attemptNumber: DeliverableFulfillmentRepository.readAttemptNumber(result),
  };
}

function toView(row: FulfillmentJobRow, includeQuality = false): FulfillmentJobView {
  const result = (row.result ?? {}) as Record<string, unknown>;
  const rawArtifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
  const artifacts: FulfillmentArtifactView[] = [];
  for (const a of rawArtifacts) {
    if (!a || typeof a !== 'object') continue;
    const art = a as Record<string, unknown>;
    const filename = typeof art.filename === 'string' ? art.filename : null;
    if (!filename) continue;
    artifacts.push({
      type: typeof art.type === 'string' ? art.type : 'file',
      filename,
      downloadLabel: typeof art.downloadLabel === 'string' ? art.downloadLabel : filename,
    });
  }

  return {
    id: row.id,
    paymentId: row.payment_id,
    deliverableId: row.deliverable_id,
    planSlug: row.plan_slug,
    purchaseType: row.purchase_type,
    status: row.status,
    reviewStatus: row.review_status ?? 'approved',
    reviewNotes: row.review_notes,
    releasedAt: row.released_at ? row.released_at.toISOString() : null,
    error: row.error,
    publicUrl: typeof result.publicUrl === 'string' ? result.publicUrl : null,
    projectId: typeof result.projectId === 'string' ? result.projectId : null,
    artifacts,
    clientVisible: row.review_status === 'approved' || row.review_status == null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    ...(includeQuality ? { qualityChecklist: readQualityChecklist(result) } : {}),
  };
}

export class DeliverableFulfillmentReadService {
  private repo = new DeliverableFulfillmentRepository();

  async listForUser(userId: string, limit = 50): Promise<FulfillmentJobView[]> {
    const rows = await this.repo.listByUserId(userId, limit);
    return rows.map((row) => toView(row));
  }

  async listForAdmin(input: { limit?: number; status?: FulfillmentJobRow['status'] }): Promise<FulfillmentJobView[]> {
    const rows = await this.repo.listAdmin(input);
    return rows.map((row) => toView(row, true));
  }

  async getJob(paymentId: string, userId: string, role: string): Promise<FulfillmentJobView> {
    const row = await this.repo.getByPaymentId(paymentId);
    if (!row) throw new NotFoundError('Fulfillment job');
    if (row.user_id !== userId && !isAdminRole(role)) {
      throw new AuthorizationError('Not allowed to view this fulfillment job');
    }
    return toView(row, isAdminRole(role));
  }

  async getArtifactFile(input: {
    paymentId: string;
    filename: string;
    userId: string;
    role: string;
  }): Promise<{ filePath: string; downloadName: string; contentType: string }> {
    const safeName = path.basename(input.filename).replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!safeName) throw new NotFoundError('Artifact');

    const row = await this.repo.getByPaymentId(input.paymentId);
    if (!row) throw new NotFoundError('Fulfillment job');
    if (row.user_id !== input.userId && !isAdminRole(input.role)) {
      throw new AuthorizationError('Not allowed to download this artifact');
    }
    if (!isAdminRole(input.role) && row.review_status !== 'approved') {
      throw new AuthorizationError('Deliverable pending QA approval');
    }

    const result = (row.result ?? {}) as Record<string, unknown>;
    const rawArtifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    const match = rawArtifacts.find((a) => {
      if (!a || typeof a !== 'object') return false;
      return (a as Record<string, unknown>).filename === safeName;
    }) as Record<string, unknown> | undefined;

    const storagePath = typeof match?.storagePath === 'string' ? match.storagePath : null;
    if (!storagePath || !fs.existsSync(storagePath)) {
      throw new NotFoundError('Artifact');
    }

    const resolved = path.resolve(storagePath);
    const root = path.resolve(process.cwd(), 'data', 'client-deliverables');
    if (!resolved.startsWith(root)) {
      throw new AuthorizationError('Invalid artifact path');
    }

    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.md'
          ? 'text/markdown; charset=utf-8'
          : ext === '.json'
            ? 'application/json'
            : 'application/octet-stream';

    const label = typeof match?.downloadLabel === 'string' ? match.downloadLabel.trim() : '';
    const downloadName = !label
      ? safeName
      : ext && !label.toLowerCase().endsWith(ext)
        ? `${label}${ext}`
        : label;

    return {
      filePath: resolved,
      downloadName,
      contentType,
    };
  }
}

import fs from 'fs';
import path from 'path';
import { NotFoundError, AuthorizationError } from '../../../utils/errors';
import { DeliverableFulfillmentRepository, type FulfillmentJobRow } from '../repository/deliverable-fulfillment.repository';

export type FulfillmentArtifactView = {
  type: string;
  filename: string;
  downloadLabel?: string;
};

/** Summary exposed on admin/client fulfillment job APIs for remote substance verify. */
export type DocumentQualitySummary = {
  sectionCount: number;
  totalBodyChars: number;
  minSectionBodyChars: number;
  checklistOrMilestoneHits: number;
  clientNamePresent: boolean;
  industryPresent: boolean;
  bundleDocs?: number;
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
  /** Industry slug from checkout/matrix — null only when never provided. */
  industryCategory: string | null;
  /** Machine-checkable document substance metrics (when computed at fulfillment). */
  documentQuality: DocumentQualitySummary | null;
  documentSubstanceOk: boolean | null;
  artifacts: FulfillmentArtifactView[];
  clientVisible: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin' || role === 'operator';
}

function readIndustryCategory(result: Record<string, unknown>): string | null {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const raw = meta.industryCategory ?? result.industryCategory;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function readDocumentQuality(result: Record<string, unknown>): DocumentQualitySummary | null {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const q = meta.documentQuality;
  if (!q || typeof q !== 'object') return null;
  const o = q as Record<string, unknown>;
  return {
    sectionCount: Number(o.sectionCount ?? 0),
    totalBodyChars: Number(o.totalBodyChars ?? 0),
    minSectionBodyChars: Number(o.minSectionBodyChars ?? 0),
    checklistOrMilestoneHits: Number(o.checklistOrMilestoneHits ?? 0),
    clientNamePresent: o.clientNamePresent !== false,
    industryPresent: o.industryPresent !== false,
    ...(typeof o.bundleDocs === 'number' ? { bundleDocs: o.bundleDocs } : {}),
  };
}

function readDocumentSubstanceOk(result: Record<string, unknown>): boolean | null {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const v = meta.documentSubstanceOk;
  if (typeof v === 'boolean') return v;
  return null;
}

/** Pure mapper — exported for unit tests of admin API metadata shape. */
export function toFulfillmentJobView(row: FulfillmentJobRow): FulfillmentJobView {
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
    industryCategory: readIndustryCategory(result),
    documentQuality: readDocumentQuality(result),
    documentSubstanceOk: readDocumentSubstanceOk(result),
    artifacts,
    clientVisible: row.review_status === 'approved' || row.review_status == null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  };
}

export class DeliverableFulfillmentReadService {
  private repo = new DeliverableFulfillmentRepository();

  async listForUser(userId: string, limit = 50): Promise<FulfillmentJobView[]> {
    const rows = await this.repo.listByUserId(userId, limit);
    return rows.map(toFulfillmentJobView);
  }

  async listForAdmin(input: { limit?: number; status?: FulfillmentJobRow['status'] }): Promise<FulfillmentJobView[]> {
    const rows = await this.repo.listAdmin(input);
    return rows.map(toFulfillmentJobView);
  }

  async getJob(paymentId: string, userId: string, role: string): Promise<FulfillmentJobView> {
    const row = await this.repo.getByPaymentId(paymentId);
    if (!row) throw new NotFoundError('Fulfillment job');
    if (row.user_id !== userId && !isAdminRole(role)) {
      throw new AuthorizationError('Not allowed to view this fulfillment job');
    }
    return toFulfillmentJobView(row);
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
    const rel = path.relative(root, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
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

    return {
      filePath: resolved,
      downloadName: typeof match?.downloadLabel === 'string' ? match.downloadLabel : safeName,
      contentType,
    };
  }
}

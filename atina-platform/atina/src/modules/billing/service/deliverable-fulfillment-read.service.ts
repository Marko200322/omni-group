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

/** Ops/retainer substance — exposed so LIVE probes can prove tickets/CRM/RAG (not docs theater). */
export type FulfillmentOpsEvidence = {
  problemsCoveredCount: number | null;
  problemsEmbeddedInDoc: boolean | null;
  kickoffTicketId: string | null;
  crmImportedLeads: number | null;
  crmPipelineSeeded: boolean | null;
  leadGenMode: string | null;
  leadsGenerated: number | null;
  sampleLeadsSeeded: number | null;
  analysisRulesVersion: string | null;
  ragSeeded: boolean | null;
  ragRecallHits: number | null;
  supportSlaHours: number | null;
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
  /**
   * Checklist score/passed from result.fulfillmentMeta — exposed so remote matrix
   * probes cannot treat "job completed" as quality PASS when the gate was never read.
   */
  checklistScore: number | null;
  checklistPassed: boolean | null;
  /** Checklist item ids that failed (excl. catalog_description) — empty when all passed. */
  checklistFailedIds: string[];
  /** Ops substance from result.metadata for retainer/vertical LIVE proof. */
  opsEvidence: FulfillmentOpsEvidence;
  /**
   * Bundle child step bookkeeping from result.metadata.bundleSteps —
   * exposed so LIVE probes can prove children completed (not score-only theater).
   */
  bundleSteps: Array<{
    deliverableId: string;
    status: string;
    artifactCount: number;
    publicUrl?: string | null;
    error?: string;
  }> | null;
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

function readBundleSteps(
  result: Record<string, unknown>,
): FulfillmentJobView['bundleSteps'] {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const raw = meta.bundleSteps;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const steps: NonNullable<FulfillmentJobView['bundleSteps']> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const deliverableId = typeof o.deliverableId === 'string' ? o.deliverableId.trim() : '';
    const status = typeof o.status === 'string' ? o.status.trim() : '';
    if (!deliverableId || !status) continue;
    const artifactCount =
      typeof o.artifactCount === 'number' && Number.isFinite(o.artifactCount)
        ? o.artifactCount
        : 0;
    const step: NonNullable<FulfillmentJobView['bundleSteps']>[number] = {
      deliverableId,
      status,
      artifactCount,
    };
    if (typeof o.publicUrl === 'string' || o.publicUrl === null) {
      step.publicUrl = o.publicUrl as string | null;
    }
    if (typeof o.error === 'string' && o.error.trim()) {
      step.error = o.error.trim();
    }
    steps.push(step);
  }
  return steps.length ? steps : null;
}

function readChecklistSummary(result: Record<string, unknown>): {
  checklistScore: number | null;
  checklistPassed: boolean | null;
  checklistFailedIds: string[];
} {
  const meta = result.fulfillmentMeta;
  if (!meta || typeof meta !== 'object') {
    return { checklistScore: null, checklistPassed: null, checklistFailedIds: [] };
  }
  const checklist = (meta as Record<string, unknown>).checklist;
  if (!checklist || typeof checklist !== 'object') {
    return { checklistScore: null, checklistPassed: null, checklistFailedIds: [] };
  }
  const c = checklist as Record<string, unknown>;
  const scoreRaw = c.score;
  const checklistScore =
    typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)
      ? scoreRaw
      : typeof scoreRaw === 'string' && scoreRaw.trim() !== '' && Number.isFinite(Number(scoreRaw))
        ? Number(scoreRaw)
        : null;
  const checklistPassed = typeof c.passed === 'boolean' ? c.passed : null;
  const items = Array.isArray(c.items) ? c.items : [];
  const checklistFailedIds = items
    .filter((it) => {
      if (!it || typeof it !== 'object') return false;
      const o = it as Record<string, unknown>;
      return o.passed === false && o.id !== 'catalog_description' && typeof o.id === 'string';
    })
    .map((it) => String((it as Record<string, unknown>).id));
  return { checklistScore, checklistPassed, checklistFailedIds };
}

function readOpsEvidence(result: Record<string, unknown>): FulfillmentOpsEvidence {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const problemsCovered = Array.isArray(meta.problemsCovered) ? meta.problemsCovered : [];
  const declared = Number(meta.problemsCoveredCount ?? meta.problemsListed);
  const problemsCoveredCount = Number.isFinite(declared)
    ? declared
    : problemsCovered.length > 0
      ? problemsCovered.length
      : null;
  const crm = meta.crmBootstrap as Record<string, unknown> | undefined;
  const lead = meta.leadGenStats as Record<string, unknown> | undefined;
  const analysis = lead?.analysis as Record<string, unknown> | undefined;
  const ai = meta.aiSupportSetup as Record<string, unknown> | undefined;
  const support = meta.supportAutomation as Record<string, unknown> | undefined;
  const asNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
  const asStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    problemsCoveredCount,
    problemsEmbeddedInDoc: asBool(meta.problemsEmbeddedInDoc),
    kickoffTicketId: asStr(meta.kickoffTicketId),
    crmImportedLeads: asNum(crm?.importedLeads),
    crmPipelineSeeded:
      asBool(crm?.pipelineSeeded) ??
      (crm && (asNum(crm.importedLeads) ?? 0) > 0 ? true : crm ? true : null),
    leadGenMode: asStr(lead?.mode),
    leadsGenerated: asNum(lead?.leadsGenerated),
    sampleLeadsSeeded: asNum(lead?.sampleLeadsSeeded),
    analysisRulesVersion: asStr(analysis?.rulesVersion),
    ragSeeded: asBool(ai?.ragSeeded),
    ragRecallHits: asNum(ai?.ragRecallHits),
    supportSlaHours: asNum(support?.slaHours),
  };
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

  const { checklistScore, checklistPassed, checklistFailedIds } = readChecklistSummary(result);

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
    checklistScore,
    checklistPassed,
    checklistFailedIds,
    opsEvidence: readOpsEvidence(result),
    bundleSteps: readBundleSteps(result),
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

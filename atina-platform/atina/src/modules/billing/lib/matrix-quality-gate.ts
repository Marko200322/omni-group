/**
 * Pure matrix quality-gate decision (mirrors scripts/e2e-fulfillment-matrix-prod.ps1).
 * Never treat "job completed" alone as PASS — require checklist, substance, or live URL.
 */

export type MatrixJobProbe = {
  checklistScore?: number | null;
  checklistPassed?: boolean | null;
  fulfillmentMeta?: {
    checklist?: { score?: unknown; passed?: unknown; items?: unknown[] } | null;
  } | null;
  result?: {
    fulfillmentMeta?: {
      checklist?: { score?: unknown; passed?: unknown; items?: unknown[] } | null;
    } | null;
  } | null;
  documentSubstanceOk?: boolean | null;
  documentQuality?: { totalBodyChars?: number | null } | null;
  publicUrl?: string | null;
};

export type MatrixQualityGateDecision =
  | { decision: 'pass'; gate: 'checklist' | 'documentSubstanceOk'; score: string }
  | { decision: 'need_live_url'; publicUrl: string }
  | { decision: 'fail'; reason: string };

function finiteScore(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return null;
}

function readChecklist(job: MatrixJobProbe): { score: number; passed: boolean } | null {
  if (typeof job.checklistPassed === 'boolean') {
    const score = finiteScore(job.checklistScore);
    if (score == null) {
      return null; // incomplete top-level — do not invent a score
    }
    return { score, passed: job.checklistPassed };
  }
  const nested =
    job.fulfillmentMeta?.checklist ?? job.result?.fulfillmentMeta?.checklist ?? null;
  if (!nested || typeof nested !== 'object') return null;
  const score = finiteScore(nested.score);
  if (score == null || typeof nested.passed !== 'boolean') return null;
  return { score, passed: nested.passed };
}

/**
 * Resolve quality evidence for a completed fulfillment job view.
 * Caller must HTTP-verify publicUrl when decision is need_live_url.
 */
export function resolveMatrixQualityGate(job: MatrixJobProbe): MatrixQualityGateDecision {
  const checklist = readChecklist(job);
  if (checklist) {
    if (!checklist.passed) {
      return {
        decision: 'fail',
        reason: `Checklist failed (${checklist.score}pct)`,
      };
    }
    return {
      decision: 'pass',
      gate: 'checklist',
      score: String(checklist.score),
    };
  }

  // Top-level checklist fields present but incomplete → hard fail (anti empty-score PASS)
  if (typeof job.checklistPassed === 'boolean' && finiteScore(job.checklistScore) == null) {
    return {
      decision: 'fail',
      reason: 'checklistPassed set but checklistScore missing — refusing fake PASS',
    };
  }

  if (job.documentSubstanceOk === true) {
    const chars = job.documentQuality?.totalBodyChars;
    const score =
      typeof chars === 'number' && Number.isFinite(chars) && chars > 0
        ? `sub:${chars}`
        : 'substance';
    return { decision: 'pass', gate: 'documentSubstanceOk', score };
  }

  const publicUrl = typeof job.publicUrl === 'string' ? job.publicUrl.trim() : '';
  if (publicUrl) {
    return { decision: 'need_live_url', publicUrl };
  }

  return {
    decision: 'fail',
    reason: 'No quality evidence (checklist/substance/publicUrl) — refusing fake PASS',
  };
}

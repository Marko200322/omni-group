import type { FulfillmentResult } from './types';

export type BundleStepResult = {
  deliverableId: string;
  status: 'completed' | 'partial' | 'failed' | 'skipped';
  artifactCount: number;
  publicUrl?: string | null;
  projectId?: string;
  error?: string;
};

/** Child deliverable IDs each catalog bundle must complete. */
export const BUNDLE_EXPECTED_STEPS: Record<string, string[]> = {
  'bundle-portal-presence': ['setup-quick', 'landing'],
  'bundle-sales-launch': ['landing', 'sales-enablement'],
  'bundle-ops-clarity': ['audit', 'workflow-design'],
};

export function expectedBundleStepIds(bundleId: string): string[] {
  return BUNDLE_EXPECTED_STEPS[bundleId] ?? [];
}

function mergeDocumentQuality(parts: FulfillmentResult[]): Record<string, unknown> | null {
  const qualities = parts
    .map((p) => p.metadata?.documentQuality as Record<string, unknown> | undefined)
    .filter(Boolean) as Array<{
    sectionCount?: number;
    totalBodyChars?: number;
    minSectionBodyChars?: number;
    checklistOrMilestoneHits?: number;
    clientNamePresent?: boolean;
  }>;
  if (!qualities.length) return null;
  return {
    sectionCount: Math.min(...qualities.map((q) => Number(q.sectionCount ?? 0))),
    totalBodyChars: qualities.reduce((n, q) => n + Number(q.totalBodyChars ?? 0), 0),
    minSectionBodyChars: Math.min(...qualities.map((q) => Number(q.minSectionBodyChars ?? 0))),
    checklistOrMilestoneHits: qualities.reduce(
      (n, q) => n + Number(q.checklistOrMilestoneHits ?? 0),
      0,
    ),
    clientNamePresent: qualities.every((q) => q.clientNamePresent !== false),
    industryPresent: true,
    bundleDocs: qualities.length,
  };
}

/** Prefer setup project for portal bundles; otherwise first project from a completed step. */
function pickProjectId(parts: FulfillmentResult[]): string | undefined {
  const setup = parts.find((p) => p.metadata?.setupTier && p.projectId);
  if (setup?.projectId) return setup.projectId;
  return parts.find((p) => p.projectId)?.projectId;
}

export function mergeBundleResults(
  bundleId: string,
  expectedIds: string[],
  parts: FulfillmentResult[],
  stepResults: BundleStepResult[],
): FulfillmentResult {
  const artifacts = parts.flatMap((p) => p.artifacts);
  const metadata: Record<string, unknown> = {
    bundleId,
    bundleParts: parts.length,
    expectedSteps: expectedIds,
    bundleSteps: stepResults,
  };

  const setupMeta = parts.find((p) => p.metadata?.setupTier)?.metadata;

  for (const p of parts) {
    if (p.publicUrl) metadata.publicUrl = p.publicUrl;
    if (p.projectId) metadata.projectId = p.projectId;
    if (p.metadata) Object.assign(metadata, p.metadata);
  }

  // Setup-critical fields win over later child metadata (landing must not wipe portal state).
  if (setupMeta) {
    if (setupMeta.modulesActivated != null) metadata.modulesActivated = setupMeta.modulesActivated;
    if (setupMeta.portalReady != null) metadata.portalReady = setupMeta.portalReady;
    if (setupMeta.setupTier != null) metadata.setupTier = setupMeta.setupTier;
    if (setupMeta.crmBootstrap != null) metadata.crmBootstrap = setupMeta.crmBootstrap;
    if (setupMeta.portalEntitlements != null) metadata.portalEntitlements = setupMeta.portalEntitlements;
  }

  const mergedQuality = mergeDocumentQuality(parts);
  if (mergedQuality) {
    metadata.documentQuality = mergedQuality;
    metadata.documentSubstanceOk = parts.every((p) => p.metadata?.documentSubstanceOk !== false);
  }

  // Step bookkeeping wins over any child metadata key collisions.
  metadata.bundleId = bundleId;
  metadata.bundleParts = parts.length;
  metadata.expectedSteps = expectedIds;
  metadata.bundleSteps = stepResults;

  const allExpectedDone =
    stepResults.length === expectedIds.length &&
    expectedIds.every((id, i) => stepResults[i]?.deliverableId === id) &&
    stepResults.every((s) => s.status === 'completed');
  const anyFailed = stepResults.some((s) => s.status === 'failed' || s.status === 'partial');
  const childIncomplete = parts.some((p) => p.status !== 'completed');

  let status: 'completed' | 'partial' = 'completed';
  if (!allExpectedDone || anyFailed || childIncomplete) {
    status = 'partial';
    metadata.reason =
      anyFailed || childIncomplete ? 'bundle_step_failed' : 'bundle_steps_incomplete';
  }

  return {
    artifacts,
    status,
    publicUrl: parts.find((p) => p.publicUrl)?.publicUrl ?? null,
    projectId: pickProjectId(parts),
    metadata,
  };
}

export function summarizeBundleStep(
  deliverableId: string,
  part: FulfillmentResult,
  error?: string,
): BundleStepResult {
  return {
    deliverableId,
    status: error ? 'failed' : part.status === 'completed' ? 'completed' : 'partial',
    artifactCount: part.artifacts.length,
    publicUrl: part.publicUrl ?? null,
    projectId: part.projectId,
    ...(error ? { error } : {}),
  };
}

import type { FulfillmentResult } from '../../../modules/billing/lib/deliverable-handlers/types';

const DEFAULT_PROBLEMS = [
  'Primary operational bottleneck in daily work',
  'Manual handoffs between tools and people',
  'Unclear ownership of client delivery steps',
  'Missing portal visibility for status and files',
  'Invoice and delivery tracking gap after payment',
];

const DEFAULT_MODULES = ['notifications', 'billing', 'crm', 'tasks'];

/** High enough to clear every DOC_SUBSTANCE_THRESHOLDS floor in unit fixtures. */
const PASSING_DOC_QUALITY = {
  sectionCount: 10,
  totalBodyChars: 5000,
  minSectionBodyChars: 200,
  checklistOrMilestoneHits: 3,
  clientNamePresent: true,
  industryPresent: true,
};

function unionModules(existing: unknown): string[] {
  const fromMeta = Array.isArray(existing)
    ? existing.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    : [];
  return Array.from(new Set([...DEFAULT_MODULES, ...fromMeta]));
}

function mergeDocQuality(meta: Record<string, unknown>) {
  const existing = meta.documentQuality as Partial<typeof PASSING_DOC_QUALITY> | undefined;
  if (!existing || typeof existing !== 'object') return PASSING_DOC_QUALITY;
  return {
    sectionCount: Math.max(Number(existing.sectionCount ?? 0), PASSING_DOC_QUALITY.sectionCount),
    totalBodyChars: Math.max(Number(existing.totalBodyChars ?? 0), PASSING_DOC_QUALITY.totalBodyChars),
    minSectionBodyChars: Math.max(
      Number(existing.minSectionBodyChars ?? 0),
      PASSING_DOC_QUALITY.minSectionBodyChars,
    ),
    checklistOrMilestoneHits: Math.max(
      Number(existing.checklistOrMilestoneHits ?? 0),
      PASSING_DOC_QUALITY.checklistOrMilestoneHits,
    ),
    clientNamePresent: existing.clientNamePresent !== false,
    industryPresent: existing.industryPresent !== false,
  };
}

/** Enrich handler/unit fixtures with invoice + companion proof required by the live checklist. */
export function withCommercialDeliveryProof(result: FulfillmentResult): FulfillmentResult {
  const hasCompanion = result.artifacts.some((a) => a.filename === 'commercial-delivery-pack.md');
  const hasMarkdown = result.artifacts.some((a) => a.filename.toLowerCase().endsWith('.md'));
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const problems = Array.isArray(meta.problemsCovered)
    ? (meta.problemsCovered as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length >= 8)
    : [];
  const modules = unionModules(meta.modulesActivated);
  const existingEntitlements = (meta.portalEntitlements ?? {}) as Record<string, unknown>;
  const granted = Array.isArray(existingEntitlements.userModulesGranted)
    ? (existingEntitlements.userModulesGranted as unknown[]).filter(
        (m): m is string => typeof m === 'string',
      )
    : [];
  const liveProbe =
    meta.liveProbe && typeof meta.liveProbe === 'object'
      ? { ...(meta.liveProbe as Record<string, unknown>), omniChrome: false }
      : meta.liveProbe;

  return {
    ...result,
    projectId: result.projectId ?? 'proj-test-1',
    artifacts: [
      ...result.artifacts,
      ...(hasCompanion
        ? []
        : [
            {
              type: 'commercial_companion',
              filename: 'commercial-delivery-pack.md',
              downloadLabel: 'Commercial delivery pack',
              storagePath: '/tmp/commercial-delivery-pack.md',
            },
          ]),
      ...(hasMarkdown || hasCompanion
        ? []
        : [
            {
              type: 'md',
              filename: 'deliverable.md',
              downloadLabel: 'Markdown',
              storagePath: '/tmp/deliverable.md',
            },
          ]),
    ],
    metadata: {
      ...meta,
      liveProbe,
      invoiceLinked: true,
      invoiceId: typeof meta.invoiceId === 'string' ? meta.invoiceId : 'inv-test-1',
      invoiceNumber: typeof meta.invoiceNumber === 'string' ? meta.invoiceNumber : 'INV-TEST-0001',
      commercialInvoice: meta.commercialInvoice ?? {
        invoiceId: 'inv-test-1',
        invoiceNumber: 'INV-TEST-0001',
        status: 'paid',
        documentKind: 'payment_receipt',
        billingPortalPath: '/dashboard/billing',
      },
      serviceCompanion: true,
      commercialCompanion: true,
      kickoffTicketId: typeof meta.kickoffTicketId === 'string' ? meta.kickoffTicketId : 'ticket-test-1',
      problemsCovered: problems.length >= 5 ? problems : DEFAULT_PROBLEMS,
      problemsCoveredCount: Math.max(problems.length, DEFAULT_PROBLEMS.length),
      problemsEmbeddedInDoc: true,
      documentSubstanceOk: true,
      documentQuality: mergeDocQuality(meta),
      pdfBytes: Math.max(Number(meta.pdfBytes ?? 0), 15000),
      pdfPageCount: Math.max(Number(meta.pdfPageCount ?? 0), 3),
      pdfSubstanceOk: true,
      // Real fulfillment always stamps order refs; only preserve when fixtures declare them.
      ...(typeof meta.contentOrderRef === 'string' && String(meta.contentOrderRef).trim().length >= 8
        ? {
            contentOrderRef: meta.contentOrderRef,
            orderBoundInDoc: true,
            contentFingerprint:
              typeof meta.contentFingerprint === 'string'
                ? meta.contentFingerprint
                : 'test-fingerprint-0001',
          }
        : {}),
      modulesActivated: modules,
      portalEntitlements: {
        ...existingEntitlements,
        entitlementSource: 'user_modules+org',
        userModulesGranted: Array.from(new Set([...DEFAULT_MODULES, ...granted])),
        billingAccess: true,
        notificationSeeded: true,
        portalReady: true,
        onboardingTasksSeeded: true,
      },
    },
  };
}

import { ProductFactoryService } from '../../../product-factory/service/product-factory.service';
import {
  ClientDeliverableBootstrapService,
  type PortalEntitlementResult,
} from '../../service/client-deliverable-bootstrap.service';
import { persistTextArtifact } from './artifact-helpers';
import type { FulfillmentArtifact, FulfillmentContext, FulfillmentResult } from './types';
import logger from '../../../../utils/logger';

const factory = new ProductFactoryService();
const bootstrap = new ClientDeliverableBootstrapService();

/** Document-primary SKUs that must ship a real service companion (not PDF alone). */
export const SERVICE_COMPANION_IDS = new Set([
  'audit',
  'workflow-design',
  'integration',
  'sales-enablement',
  'bundle-ops-clarity',
  'seo-audit',
  'email-marketing',
  'reputation-management',
  // High-ticket hosted sites: live URL alone is not enough for list price (F-14).
  'website-business',
  'website-ecommerce',
]);

export type CommercialCompanionAttach = {
  projectId?: string;
  kickoffTicketId?: string;
  portalEntitlements: PortalEntitlementResult | null;
  companionArtifact: FulfillmentArtifact;
  metadata: Record<string, unknown>;
};

function buildCompanionMarkdown(input: {
  clientName: string;
  deliverableId: string;
  industryCategory?: string | null;
  projectId?: string;
  kickoffTicketId?: string;
  publicUrl?: string | null;
  invoiceNumber?: string | null;
  productLines: string[];
  serviceLines: string[];
  documentLines: string[];
}): string {
  return `# Commercial delivery pack — ${input.clientName}

Package: ${input.deliverableId}
Industry: ${input.industryCategory ?? 'general'}
Generated: ${new Date().toISOString()}

## What you received (not documents alone)

### Product
${input.productLines.map((l) => `- ${l}`).join('\n') || '- (see Deliveries / live URL)'}

### Service
${input.serviceLines.map((l) => `- ${l}`).join('\n') || '- Kickoff support engagement opened in portal Tasks'}

### Documents (accompany product + service)
${input.documentLines.map((l) => `- ${l}`).join('\n') || '- PDF + markdown pack in Deliveries'}

### Invoice / receipt
- Open **Billing** in the client portal for your paid invoice or payment receipt.
${input.invoiceNumber ? `- Invoice number: **${input.invoiceNumber}**` : '- Invoice is linked to this payment and visible under Billing.'}
${input.publicUrl ? `\n### Live product URL\n- ${input.publicUrl}` : ''}
${input.projectId ? `\n### Workspace project\n- Project id: \`${input.projectId}\`` : ''}
${input.kickoffTicketId ? `\n### Kickoff ticket\n- Ticket id: \`${input.kickoffTicketId}\`` : ''}

## How to verify we are serious
1. Download the PDF/MD pack from **Deliveries** (documents that *follow* the product/service).
2. Confirm the kickoff ticket under **Tasks** (service queue).
3. Open **Billing** and download the invoice / payment receipt for this purchase.
4. Use any live URL or portal modules listed above (the product).
`;
}

/**
 * Attach service + commercial companion so document SKUs never ship PDF-only.
 * Creates workspace project, kickoff ticket, portal billing access, and a client-facing MD index.
 */
export async function attachServiceAndCommercialCompanion(
  ctx: FulfillmentContext,
  base: FulfillmentResult,
  opts?: { invoiceNumber?: string | null },
): Promise<CommercialCompanionAttach> {
  let projectId = base.projectId;
  if (!projectId?.trim()) {
    try {
      const pipeline = await factory.runAutomatedClientOrder({
        userId: ctx.userId,
        paymentId: ctx.paymentId,
        deliverableId: ctx.deliverableId,
        slug: `svc-${ctx.deliverableId.replace(/[^a-z0-9-]/gi, '').slice(0, 24)}-${ctx.paymentId.replace(/-/g, '').slice(0, 12)}`,
        name: `${ctx.deliverableId} — ${ctx.clientName}`,
        description: `Service workspace for ${ctx.deliverableId} (${ctx.industryCategory ?? 'general'}). Documents accompany this engagement; they do not replace it.`,
        clientName: ctx.clientName,
        clientEmail: ctx.clientEmail ?? null,
        industryCategory: ctx.industryCategory ?? null,
        publishSite: false,
        skipWebsite: true,
        generationHints: ctx.generationHints,
      });
      projectId = typeof pipeline.projectId === 'string' ? pipeline.projectId : undefined;
    } catch (err) {
      logger.warn('Service companion project create failed', {
        paymentId: ctx.paymentId,
        deliverableId: ctx.deliverableId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const kickoffTicketId =
    (typeof base.metadata?.kickoffTicketId === 'string' && base.metadata.kickoffTicketId.trim()
      ? base.metadata.kickoffTicketId
      : undefined) ??
    (await bootstrap.openKickoffSupportTicket({
      userId: ctx.userId,
      clientName: ctx.clientName,
      deliverableId: ctx.deliverableId,
      slaHours: 48,
      industryCategory: ctx.industryCategory,
    }));

  let portalEntitlements: PortalEntitlementResult | null = null;
  try {
    portalEntitlements = await bootstrap.grantPortalEntitlements({
      userId: ctx.userId,
      moduleSlugs: ['notifications', 'billing', 'tasks'],
      clientName: ctx.clientName,
      industryCategory: ctx.industryCategory,
      seedWelcomeNotification: true,
    });
  } catch (err) {
    logger.warn('Service companion portal entitlements failed', {
      paymentId: ctx.paymentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const docNames = base.artifacts
    .filter((a) => /\.(pdf|md)$/i.test(a.filename))
    .map((a) => a.downloadLabel ?? a.filename);
  const productLines: string[] = [];
  if (base.publicUrl?.trim()) productLines.push(`Live URL: ${base.publicUrl}`);
  if (projectId) productLines.push(`Client workspace project (${projectId})`);
  if (portalEntitlements?.billingAccess) {
    productLines.push('Portal Billing access (invoice / receipt visible)');
  }
  if (base.artifacts.some((a) => a.type === 'integration_config' || a.filename.includes('integration-config'))) {
    productLines.push('Integration config pack (documented endpoints — not live-wired)');
  }
  if (base.artifacts.some((a) => /\.tar\.gz$/i.test(a.filename) || a.type === 'software_scaffold')) {
    productLines.push('Downloadable software scaffold archive');
  }
  if (!productLines.length) {
    productLines.push('Engagement workspace + portal entitlements for this package');
  }

  const serviceLines = [
    kickoffTicketId
      ? `Kickoff support ticket ${kickoffTicketId} (portal Tasks)`
      : 'Kickoff support ticket queued in portal Tasks',
    'Human follow-up against the kickoff ticket (service, not PDF theater)',
    'Response target: 48 business hours for consulting kickoff',
  ];

  const companionArtifact = persistTextArtifact({
    ctx,
    filename: 'commercial-delivery-pack.md',
    type: 'commercial_companion',
    downloadLabel: 'Commercial delivery pack (product + service + docs + invoice)',
    content: buildCompanionMarkdown({
      clientName: ctx.clientName,
      deliverableId: ctx.deliverableId,
      industryCategory: ctx.industryCategory,
      projectId,
      kickoffTicketId,
      publicUrl: base.publicUrl,
      invoiceNumber: opts?.invoiceNumber ?? null,
      productLines,
      serviceLines,
      documentLines: docNames.length
        ? docNames
        : ['Package PDF + markdown (download from Deliveries)'],
    }),
  });

  return {
    projectId,
    kickoffTicketId,
    portalEntitlements,
    companionArtifact,
    metadata: {
      serviceCompanion: true,
      kickoffTicketId: kickoffTicketId ?? null,
      commercialCompanion: true,
      portalEntitlements: portalEntitlements
        ? {
            entitlementSource: portalEntitlements.entitlementSource,
            userModulesGranted: portalEntitlements.userModulesGranted,
            billingAccess: portalEntitlements.billingAccess,
            notificationSeeded: portalEntitlements.notificationSeeded,
            portalReady: portalEntitlements.portalReady,
          }
        : null,
      modulesActivated: portalEntitlements?.modulesActivated ?? ['notifications', 'billing', 'tasks'],
    },
  };
}

export function mergeServiceCompanion(
  base: FulfillmentResult,
  companion: CommercialCompanionAttach,
): FulfillmentResult {
  const ticketOk = Boolean(companion.kickoffTicketId?.trim());
  const projectOk = Boolean(companion.projectId?.trim());
  const companionOk = Boolean(companion.companionArtifact);
  const substanceFailed = base.metadata?.documentSubstanceOk === false;
  const status: 'completed' | 'partial' =
    base.status === 'completed' && ticketOk && projectOk && companionOk && !substanceFailed
      ? 'completed'
      : 'partial';

  return {
    ...base,
    projectId: companion.projectId ?? base.projectId,
    artifacts: [...base.artifacts, companion.companionArtifact],
    status,
    metadata: {
      ...(base.metadata ?? {}),
      ...companion.metadata,
      ...(status === 'partial' && !substanceFailed
        ? {
            reason: !ticketOk
              ? 'service_companion_kickoff_missing'
              : !projectOk
                ? 'service_companion_project_missing'
                : 'service_companion_incomplete',
          }
        : {}),
    },
  };
}

export function hasCommercialCompanionArtifact(result: FulfillmentResult): boolean {
  return result.artifacts.some(
    (a) =>
      a.type === 'commercial_companion' ||
      /commercial-delivery-pack/i.test(a.filename) ||
      /commercial-companion/i.test(a.filename),
  );
}

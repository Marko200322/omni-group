import { config } from '../../../../config';
import { getDeliverable } from '../deliverable-catalog';
import { DeliverableArtifactStoreService } from '../../service/deliverable-artifact-store.service';
import { generateDeliverablePdfBuffer } from '../../service/deliverable-document-pdf.service';
import type { StructuredDeliverableDoc } from '../../service/deliverable-document-generator.service';
import type { FulfillmentArtifact, FulfillmentContext } from './types';

const store = new DeliverableArtifactStoreService();

/** Machine-checkable document substance metrics (anti-stub gate). */
export type DocumentQualityMetrics = {
  sectionCount: number;
  totalBodyChars: number;
  minSectionBodyChars: number;
  checklistOrMilestoneHits: number;
  clientNamePresent: boolean;
  industryPresent: boolean;
};

export type DocumentSubstanceThreshold = {
  minSections: number;
  minTotalChars: number;
  minSectionChars: number;
  minChecklistHits: number;
};

/** Per-package floors — empty one-liners must fail. */
export const DOC_SUBSTANCE_THRESHOLDS: Record<string, DocumentSubstanceThreshold> = {
  audit: { minSections: 6, minTotalChars: 2200, minSectionChars: 160, minChecklistHits: 1 },
  'workflow-design': { minSections: 5, minTotalChars: 2000, minSectionChars: 140, minChecklistHits: 1 },
  integration: { minSections: 6, minTotalChars: 2000, minSectionChars: 140, minChecklistHits: 1 },
  'setup-quick': { minSections: 4, minTotalChars: 1200, minSectionChars: 100, minChecklistHits: 1 },
  'setup-full': { minSections: 5, minTotalChars: 1600, minSectionChars: 120, minChecklistHits: 1 },
  'setup-custom': { minSections: 5, minTotalChars: 1600, minSectionChars: 120, minChecklistHits: 1 },
  'sales-enablement': { minSections: 5, minTotalChars: 1800, minSectionChars: 140, minChecklistHits: 1 },
  'custom-software': { minSections: 6, minTotalChars: 1800, minSectionChars: 120, minChecklistHits: 1 },
  'bundle-ops-clarity': { minSections: 5, minTotalChars: 2000, minSectionChars: 140, minChecklistHits: 1 },
  'white-label-setup': { minSections: 5, minTotalChars: 1400, minSectionChars: 100, minChecklistHits: 1 },
  'vertical-package': { minSections: 5, minTotalChars: 1200, minSectionChars: 100, minChecklistHits: 1 },
};

const CHECKLIST_MILESTONE_RE =
  /(\bday\s+\d+\b|\bweek\s+\d+\b|\bphase\s+\d+\b|\bmilestone\b|\bchecklist\b|\bsla\b|\b☐\b|\[[ x]\]|^\s*\d+\.\s|\bROI\b|\bacceptance\b|\bgo-live\b|\bKPI\b)/im;

export function assessDocumentQuality(
  doc: StructuredDeliverableDoc,
  opts?: { clientName?: string; industryCategory?: string | null },
): DocumentQualityMetrics {
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  const bodies = sections.map((s) => (s.body ?? '').trim());
  const totalBodyChars = bodies.reduce((n, b) => n + b.length, 0);
  const minSectionBodyChars = bodies.length ? Math.min(...bodies.map((b) => b.length)) : 0;
  const blob = [doc.title, doc.subtitle, ...sections.map((s) => `${s.heading}\n${s.body}`)].join('\n');
  const checklistOrMilestoneHits = (blob.match(new RegExp(CHECKLIST_MILESTONE_RE.source, 'gim')) ?? [])
    .length;
  const client = opts?.clientName?.trim().toLowerCase() ?? '';
  const industry = opts?.industryCategory?.trim().toLowerCase() ?? '';
  const lower = blob.toLowerCase();
  return {
    sectionCount: sections.length,
    totalBodyChars,
    minSectionBodyChars,
    checklistOrMilestoneHits,
    clientNamePresent: client.length >= 2 ? lower.includes(client) : true,
    industryPresent:
      industry.length >= 3
        ? lower.includes(industry.replace(/[_-]/g, ' ')) || lower.includes(industry)
        : true,
  };
}

export function documentSubstancePasses(
  metrics: DocumentQualityMetrics,
  threshold: DocumentSubstanceThreshold,
): boolean {
  return (
    metrics.sectionCount >= threshold.minSections &&
    metrics.totalBodyChars >= threshold.minTotalChars &&
    metrics.minSectionBodyChars >= threshold.minSectionChars &&
    metrics.checklistOrMilestoneHits >= threshold.minChecklistHits &&
    metrics.clientNamePresent
  );
}

export function substanceThresholdFor(deliverableId: string): DocumentSubstanceThreshold | null {
  return DOC_SUBSTANCE_THRESHOLDS[deliverableId.trim()] ?? null;
}

/** Default floor used when accepting AI-parsed docs (reject stub-length replies). */
export const AI_DOC_ACCEPTANCE_FLOOR: DocumentSubstanceThreshold = {
  minSections: 4,
  minTotalChars: 1200,
  minSectionChars: 80,
  minChecklistHits: 1,
};

export function buildDocumentQualityMetadata(
  doc: StructuredDeliverableDoc,
  ctx: Pick<FulfillmentContext, 'clientName' | 'industryCategory' | 'deliverableId'>,
): Record<string, unknown> {
  const quality = assessDocumentQuality(doc, {
    clientName: ctx.clientName,
    industryCategory: ctx.industryCategory,
  });
  const threshold = substanceThresholdFor(ctx.deliverableId);
  return {
    documentTitle: doc.title,
    documentQuality: quality,
    documentSubstanceOk: threshold ? documentSubstancePasses(quality, threshold) : null,
  };
}

export async function persistDeliverablePdf(input: {
  ctx: FulfillmentContext;
  doc: StructuredDeliverableDoc;
  artifactType: string;
  filename: string;
}): Promise<FulfillmentArtifact> {
  const deliverable = getDeliverable(input.ctx.deliverableId);
  const pdf = await generateDeliverablePdfBuffer({
    brandName: 'Omni Group',
    title: input.doc.title,
    subtitle: input.doc.subtitle,
    clientName: input.ctx.clientName,
    deliverableName: deliverable?.name ?? input.ctx.deliverableId,
    sections: input.doc.sections,
  });
  return store.saveBuffer({
    userId: input.ctx.userId,
    paymentId: input.ctx.paymentId,
    filename: input.filename,
    buffer: pdf,
    type: input.artifactType,
    downloadLabel: input.doc.title,
  });
}

export async function persistMarkdownBundle(input: {
  ctx: FulfillmentContext;
  doc: StructuredDeliverableDoc;
  artifactType: string;
}): Promise<FulfillmentArtifact> {
  const md = [
    `# ${input.doc.title}`,
    input.doc.subtitle ? `\n_${input.doc.subtitle}_\n` : '',
    ...input.doc.sections.flatMap((s) => [`\n## ${s.heading}\n`, s.body]),
  ].join('\n');
  return persistTextArtifact({
    ctx: input.ctx,
    filename: `${input.artifactType}.md`,
    content: md,
    type: input.artifactType,
    downloadLabel: `${input.doc.title} (Markdown)`,
  });
}

export function persistTextArtifact(input: {
  ctx: FulfillmentContext;
  filename: string;
  content: string;
  type: string;
  downloadLabel?: string;
}): FulfillmentArtifact {
  return store.saveText({
    userId: input.ctx.userId,
    paymentId: input.ctx.paymentId,
    filename: input.filename,
    content: input.content,
    type: input.type,
    downloadLabel: input.downloadLabel,
  });
}

export function persistJsonArtifact(input: {
  ctx: FulfillmentContext;
  filename: string;
  data: unknown;
  type: string;
  downloadLabel?: string;
}): FulfillmentArtifact {
  return persistTextArtifact({
    ctx: input.ctx,
    filename: input.filename,
    content: `${JSON.stringify(input.data, null, 2)}\n`,
    type: input.type,
    downloadLabel: input.downloadLabel,
  });
}

/** Portal modules evidence for setup-quick / portal bundles. */
export function persistPortalModulesArtifact(input: {
  ctx: FulfillmentContext;
  modulesActivated: string[];
}): FulfillmentArtifact {
  return persistJsonArtifact({
    ctx: input.ctx,
    filename: 'portal-modules.json',
    type: 'portal_modules',
    downloadLabel: 'Portal modules bootstrap',
    data: {
      clientName: input.ctx.clientName,
      deliverableId: input.ctx.deliverableId,
      generatedAt: new Date().toISOString(),
      modulesActivated: input.modulesActivated,
      expected: ['notifications', 'billing'],
      portalReady: input.modulesActivated.length > 0,
      notes: 'Login, payments, and contact notifications are wired via activated portal modules.',
    },
  });
}

export function buildMigrationCsv(clientName: string): string {
  const safe = clientName.replace(/,/g, ' ').trim() || 'Client';
  return [
    'first_name,last_name,email,company,phone,status,notes',
    `Primary,Contact,client@example.com,${safe},,+381600000000,customer,Primary account row`,
    'Lead,One,lead1@example.com,Example Co,,,lead,Import from spreadsheet',
    'Lead,Two,lead2@example.com,Sample Ltd,,,prospect,Import from spreadsheet',
    'Lead,Three,lead3@example.com,Northwind,,,lead,Import from spreadsheet',
  ].join('\n');
}

export function persistMigrationTemplate(input: {
  ctx: FulfillmentContext;
}): FulfillmentArtifact {
  return persistTextArtifact({
    ctx: input.ctx,
    filename: 'crm-migration-template.csv',
    content: buildMigrationCsv(input.ctx.clientName),
    type: 'migration_template',
    downloadLabel: 'CRM migration template (CSV)',
  });
}

export function buildTrainingOutlineMarkdown(input: {
  clientName: string;
  industryCategory?: string | null;
}): string {
  return `# Training & onboarding — ${input.clientName}

## Session 1 — Portal & dashboard (30 min)
- Login, profile, billing, deliveries panel
- How to confirm payments and download artifacts

## Session 2 — CRM & pipeline (30 min)
- Import migration CSV, stages, follow-ups
- Industry: ${input.industryCategory ?? 'general business'}

## Session 3 — Automations (30 min)
- Payment → fulfillment chain
- Notifications and tasks

## 30-day support window
- Automated ticket queue active
- Response SLA: 24 business hours
- Minor copy/config changes included
`;
}

export function trainingOutlineDoc(input: {
  clientName: string;
  industryCategory?: string | null;
}): StructuredDeliverableDoc {
  return {
    title: `Training & onboarding — ${input.clientName}`,
    subtitle: input.industryCategory ?? 'General business',
    sections: [
      {
        heading: 'Session 1 — Portal & dashboard (30 min)',
        body: 'Login, profile, billing, deliveries panel. Confirm payments and download artifacts from the client portal.',
      },
      {
        heading: 'Session 2 — CRM & pipeline (30 min)',
        body: `Import migration CSV, review stages and follow-ups. Industry focus: ${input.industryCategory ?? 'general business'}.`,
      },
      {
        heading: 'Session 3 — Automations (30 min)',
        body: 'Payment → fulfillment chain, notifications, and task creation. Validate end-to-end with a test payment.',
      },
      {
        heading: '30-day support window',
        body: 'Automated ticket queue active. Response SLA: 24 business hours. Minor copy/config changes included.',
      },
    ],
  };
}

export function persistTrainingOutlineMarkdown(input: {
  ctx: FulfillmentContext;
}): FulfillmentArtifact {
  return persistTextArtifact({
    ctx: input.ctx,
    filename: 'training-outline.md',
    content: buildTrainingOutlineMarkdown({
      clientName: input.ctx.clientName,
      industryCategory: input.ctx.industryCategory,
    }),
    type: 'training_outline',
    downloadLabel: 'Training outline',
  });
}

export async function persistTrainingOutlinePdf(input: {
  ctx: FulfillmentContext;
}): Promise<FulfillmentArtifact> {
  const doc = trainingOutlineDoc({
    clientName: input.ctx.clientName,
    industryCategory: input.ctx.industryCategory,
  });
  return persistDeliverablePdf({
    ctx: input.ctx,
    doc,
    artifactType: 'training_outline',
    filename: 'training-outline.pdf',
  });
}

export function persistProductionDeployManifest(input: {
  ctx: FulfillmentContext;
  deployPrep: Record<string, unknown> | null;
}): FulfillmentArtifact {
  const manifest = {
    clientName: input.ctx.clientName,
    deliverableId: input.ctx.deliverableId,
    generatedAt: new Date().toISOString(),
    domainSsl: {
      note: 'Point DNS A/AAAA to VPS; TLS via Caddy/nginx certbot',
      webUrl: config.app.webUrl,
      apiUrl: config.app.url,
    },
    backup: {
      schedule: 'daily 02:00 UTC',
      retentionDays: 14,
      targets: ['postgres', 'uploads', 'product-factory output'],
    },
    monitoring: {
      healthEndpoints: [`${String(config.app.url || '').replace(/\/$/, '')}/health`],
      alertEmail: config.paymentNotifyEmail || config.admin.email,
    },
    sla: { uptimeTarget: '99.5%', incidentResponseHours: 4 },
    deployPrep: input.deployPrep ?? { skipped: true, reason: 'not_run' },
  };
  return persistJsonArtifact({
    ctx: input.ctx,
    filename: 'production-deploy-manifest.json',
    type: 'production_deploy_manifest',
    downloadLabel: 'Production deploy manifest',
    data: manifest,
  });
}

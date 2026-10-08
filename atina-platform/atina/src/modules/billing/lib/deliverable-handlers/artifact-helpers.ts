import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { config } from '../../../../config';
import { getDeliverable } from '../deliverable-catalog';
import { getIndustryCategory } from '../category-pricing';
import { DeliverableArtifactStoreService } from '../../service/deliverable-artifact-store.service';
import { generateDeliverablePdf } from '../../service/deliverable-document-pdf.service';
import type { StructuredDeliverableDoc } from '../../service/deliverable-document-generator.service';
import type { FulfillmentArtifact, FulfillmentContext } from './types';

const store = new DeliverableArtifactStoreService();

/**
 * Pack the greenfield scaffold into a client-downloadable archive.
 * Without this, custom-software only ships a PDF pointing at a VPS path the client cannot access.
 */
export function persistSoftwareScaffoldArchive(input: {
  ctx: FulfillmentContext;
  outputDir: string;
}): FulfillmentArtifact {
  const root = path.resolve(input.outputDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Software scaffold outputDir missing or not a directory: ${root}`);
  }
  const required = ['package.json', 'README.md', '.env.example'];
  const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length > 0) {
    throw new Error(`Software scaffold incomplete (missing ${missing.join(', ')})`);
  }

  const tmp = path.join(
    os.tmpdir(),
    `omni-scaffold-${input.ctx.paymentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}.tar.gz`,
  );
  try {
    execFileSync('tar', ['-czf', tmp, '-C', root, '.'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const buffer = fs.readFileSync(tmp);
    if (buffer.byteLength < 800) {
      throw new Error(`Software scaffold archive too small (${buffer.byteLength} bytes)`);
    }
    return store.saveBuffer({
      userId: input.ctx.userId,
      paymentId: input.ctx.paymentId,
      filename: 'software-scaffold.tar.gz',
      buffer,
      type: 'software_scaffold',
      downloadLabel: 'Runnable software scaffold (tar.gz)',
    });
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore cleanup */
    }
  }
}

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
  /** Minimum rendered PDF bytes — thin stub PDFs must fail even if MD is ok. */
  minPdfBytes?: number;
  /** Minimum PDF page count (A4). */
  minPdfPages?: number;
};

export type PdfQualityMetrics = {
  pdfBytes: number;
  pdfPageCount: number;
};

/** Per-package floors — empty one-liners and stub PDFs must fail. */
export const DOC_SUBSTANCE_THRESHOLDS: Record<string, DocumentSubstanceThreshold> = {
  audit: {
    minSections: 8,
    minTotalChars: 4500,
    minSectionChars: 180,
    minChecklistHits: 2,
    minPdfBytes: 12000,
    minPdfPages: 3,
  },
  'workflow-design': {
    minSections: 5,
    minTotalChars: 2000,
    minSectionChars: 140,
    minChecklistHits: 1,
    minPdfBytes: 8000,
    minPdfPages: 2,
  },
  integration: {
    minSections: 7,
    minTotalChars: 2400,
    minSectionChars: 140,
    minChecklistHits: 1,
    minPdfBytes: 8000,
    minPdfPages: 2,
  },
  'setup-quick': {
    minSections: 7,
    minTotalChars: 3200,
    minSectionChars: 120,
    minChecklistHits: 2,
    minPdfBytes: 9000,
    minPdfPages: 2,
  },
  'setup-full': {
    minSections: 5,
    minTotalChars: 2000,
    minSectionChars: 120,
    minChecklistHits: 1,
    minPdfBytes: 8000,
    minPdfPages: 2,
  },
  'setup-custom': {
    minSections: 5,
    minTotalChars: 2000,
    minSectionChars: 120,
    minChecklistHits: 1,
    minPdfBytes: 8000,
    minPdfPages: 2,
  },
  'sales-enablement': {
    minSections: 5,
    minTotalChars: 1800,
    minSectionChars: 140,
    minChecklistHits: 1,
    minPdfBytes: 7000,
    minPdfPages: 2,
  },
  'custom-software': {
    minSections: 7,
    minTotalChars: 2200,
    minSectionChars: 120,
    minChecklistHits: 1,
    minPdfBytes: 6000,
    minPdfPages: 2,
  },
  'bundle-ops-clarity': {
    minSections: 5,
    minTotalChars: 2000,
    minSectionChars: 140,
    minChecklistHits: 1,
    minPdfBytes: 8000,
    minPdfPages: 2,
  },
  'white-label-setup': {
    minSections: 5,
    minTotalChars: 1800,
    minSectionChars: 120,
    minChecklistHits: 1,
    minPdfBytes: 7000,
    minPdfPages: 2,
  },
  'vertical-package': {
    minSections: 5,
    minTotalChars: 1200,
    minSectionChars: 100,
    minChecklistHits: 1,
    minPdfBytes: 5000,
    minPdfPages: 2,
  },
  landing: {
    minSections: 8,
    minTotalChars: 3200,
    minSectionChars: 140,
    minChecklistHits: 2,
    minPdfBytes: 10000,
    minPdfPages: 2,
  },
  'website-business': {
    minSections: 8,
    minTotalChars: 3400,
    minSectionChars: 140,
    minChecklistHits: 2,
    minPdfBytes: 10000,
    minPdfPages: 2,
  },
  'website-ecommerce': {
    minSections: 9,
    minTotalChars: 3600,
    minSectionChars: 140,
    minChecklistHits: 2,
    minPdfBytes: 10000,
    minPdfPages: 2,
  },
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
  const industryNormalized = industry.replace(/[_-]/g, ' ');
  const catalogLabel = getIndustryCategory(industry)?.name?.toLowerCase() ?? '';
  const catalogLabelLoose = catalogLabel.replace(/[^a-z0-9]+/g, ' ').trim();
  const industryPresent =
    industry.length < 3
      ? true
      : lower.includes(industryNormalized) ||
        lower.includes(industry) ||
        // English labels / aliases (e.g. healthcare docs say "Healthcare")
        (industry.includes('health') && lower.includes('healthcare')) ||
        (industry.includes('real') && lower.includes('real estate')) ||
        (industry.includes('ecom') && lower.includes('e-commerce')) ||
        lower.includes(industry.replace(/_/g, '-')) ||
        (catalogLabel.length >= 3 && lower.includes(catalogLabel)) ||
        (catalogLabelLoose.length >= 3 &&
          lower.replace(/[^a-z0-9]+/g, ' ').includes(catalogLabelLoose));
  return {
    sectionCount: sections.length,
    totalBodyChars,
    minSectionBodyChars,
    checklistOrMilestoneHits,
    clientNamePresent: client.length >= 2 ? lower.includes(client) : true,
    industryPresent,
  };
}

export function documentSubstancePasses(
  metrics: DocumentQualityMetrics,
  threshold: DocumentSubstanceThreshold,
  opts?: { requireIndustryPresent?: boolean },
): boolean {
  const base =
    metrics.sectionCount >= threshold.minSections &&
    metrics.totalBodyChars >= threshold.minTotalChars &&
    metrics.minSectionBodyChars >= threshold.minSectionChars &&
    metrics.checklistOrMilestoneHits >= threshold.minChecklistHits &&
    metrics.clientNamePresent;
  if (!base) return false;
  if (opts?.requireIndustryPresent && !metrics.industryPresent) return false;
  return true;
}

export function pdfSubstancePasses(
  pdf: PdfQualityMetrics,
  threshold: DocumentSubstanceThreshold,
): boolean {
  if (threshold.minPdfBytes != null && pdf.pdfBytes < threshold.minPdfBytes) return false;
  if (threshold.minPdfPages != null && pdf.pdfPageCount < threshold.minPdfPages) return false;
  return true;
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
  pdf?: PdfQualityMetrics | null,
): Record<string, unknown> {
  const industryCategory = ctx.industryCategory?.trim() || null;
  const quality = assessDocumentQuality(doc, {
    clientName: ctx.clientName,
    industryCategory,
  });
  const threshold = substanceThresholdFor(ctx.deliverableId);
  const docOk = threshold ? documentSubstancePasses(quality, threshold) : null;
  const pdfOk =
    threshold && pdf ? pdfSubstancePasses(pdf, threshold) : pdf ? true : null;
  const substanceOk =
    docOk === null && pdfOk === null
      ? null
      : (docOk !== false) && (pdfOk !== false);
  return {
    documentTitle: doc.title,
    industryCategory,
    documentQuality: quality,
    ...(pdf
      ? {
          pdfBytes: pdf.pdfBytes,
          pdfPageCount: pdf.pdfPageCount,
          pdfSubstanceOk: pdfOk,
        }
      : {}),
    documentSubstanceOk: substanceOk,
  };
}

export type PersistedDeliverablePdf = {
  artifact: FulfillmentArtifact;
  pdfBytes: number;
  pdfPageCount: number;
};

export async function persistDeliverablePdf(input: {
  ctx: FulfillmentContext;
  doc: StructuredDeliverableDoc;
  artifactType: string;
  filename: string;
}): Promise<PersistedDeliverablePdf> {
  const deliverable = getDeliverable(input.ctx.deliverableId);
  const rendered = await generateDeliverablePdf({
    brandName: 'Omni Group',
    title: input.doc.title,
    subtitle: input.doc.subtitle,
    clientName: input.ctx.clientName,
    deliverableName: deliverable?.name ?? input.ctx.deliverableId,
    sections: input.doc.sections,
  });
  const artifact = store.saveBuffer({
    userId: input.ctx.userId,
    paymentId: input.ctx.paymentId,
    filename: input.filename,
    buffer: rendered.buffer,
    type: input.artifactType,
    downloadLabel: input.doc.title,
  });
  return {
    artifact,
    pdfBytes: rendered.byteLength,
    pdfPageCount: rendered.pageCount,
  };
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
  portalEntitlements?: {
    userModulesGranted?: string[];
    billingAccess?: boolean;
    notificationSeeded?: boolean;
    entitlementSource?: string;
    portalReady?: boolean;
    orgRole?: string | null;
    onboardingTasksSeeded?: boolean;
    onboardingTaskIds?: string[];
  };
}): FulfillmentArtifact {
  const entitlements = input.portalEntitlements;
  const granted = entitlements?.userModulesGranted ?? input.modulesActivated;
  const quickThickness =
    input.ctx.deliverableId === 'setup-quick' || input.ctx.deliverableId === 'bundle-portal-presence';
  const expected = quickThickness
    ? ['notifications', 'billing', 'crm', 'tasks']
    : ['notifications', 'billing'];
  const portalReady =
    entitlements?.portalReady === true ||
    (granted.includes('notifications') &&
      granted.includes('billing') &&
      entitlements?.billingAccess === true &&
      entitlements?.notificationSeeded === true);
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
      expected,
      portalReady,
      portalEntitlements: {
        entitlementSource: entitlements?.entitlementSource ?? 'user_modules+org',
        userModulesGranted: granted,
        billingAccess: entitlements?.billingAccess ?? false,
        notificationSeeded: entitlements?.notificationSeeded ?? false,
        orgRole: entitlements?.orgRole ?? null,
        onboardingTasksSeeded: entitlements?.onboardingTasksSeeded ?? false,
        onboardingTaskIds: entitlements?.onboardingTaskIds ?? [],
      },
      notes: quickThickness
        ? 'Real entitlements: user_modules (notifications+billing+CRM view+tasks) + org billing + welcome notification + actionable onboarding tasks. Automations NOT CONNECTED. Task rows alone are not sufficient.'
        : 'Real entitlements: user_modules rows + org billing access + welcome notification. Task rows alone are not sufficient.',
    },
  });
}

export function buildMigrationCsv(
  clientName: string,
  opts?: { industryCategory?: string | null },
): string {
  const safe = clientName.replace(/,/g, ' ').trim() || 'Client';
  const industry = (opts?.industryCategory ?? 'general-business').replace(/,/g, ' ').trim();
  const header =
    'first_name,last_name,email,company,phone,status,stage,tags,source,notes';
  const rows = [
    `Primary,Contact,client@example.com,${safe},+381600000000,customer,customer,"client;primary",fulfillment,Primary account row — keep`,
    `Alex,Smith,demo.lead1@example-${industry.slice(0, 12)}.demo,[DEMO] Northline Group,+381601000001,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Import or replace with real CRM export`,
    `Jordan,Lee,demo.lead2@example-${industry.slice(0, 12)}.demo,[DEMO] Summit Ventures,+381601000002,prospect,prospect,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Stage: discovery call`,
    `Sam,Patel,demo.lead3@example-${industry.slice(0, 12)}.demo,[DEMO] Atlas Digital,+381601000003,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Warm inbound sample`,
    `Taylor,Garcia,demo.lead4@example-${industry.slice(0, 12)}.demo,[DEMO] Prime Solutions,+381601000004,prospect,prospect,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Proposal stage sample`,
    `Morgan,Kim,demo.lead5@example-${industry.slice(0, 12)}.demo,[DEMO] Horizon Labs,+381601000005,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Newsletter signup sample`,
    `Casey,Brown,demo.lead6@example-${industry.slice(0, 12)}.demo,[DEMO] BluePeak Co,+381601000006,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Referral sample`,
    `Riley,Novak,demo.lead7@example-${industry.slice(0, 12)}.demo,[DEMO] Vertex Systems,+381601000007,prospect,prospect,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Demo booked sample`,
    `Quinn,Silva,demo.lead8@example-${industry.slice(0, 12)}.demo,[DEMO] ${safe} Partners,+381601000008,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Partner intro sample`,
    `Avery,Nguyen,demo.lead9@example-${industry.slice(0, 12)}.demo,[DEMO] Cedar & Co,+381601000009,customer,customer,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Closed-won example only`,
    `Reese,Hoffman,demo.lead10@example-${industry.slice(0, 12)}.demo,[DEMO] Lakeview Ops,+381601000010,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Replace before go-live`,
    `Drew,Ibrahim,demo.lead11@example-${industry.slice(0, 12)}.demo,[DEMO] Fieldstone Agency,+381601000011,prospect,prospect,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Negotiation sample`,
    `Jamie,Costa,demo.lead12@example-${industry.slice(0, 12)}.demo,[DEMO] Pinecrest Media,+381601000012,lead,lead,"DEMO_SAMPLE;industry_template;${industry}",fulfillment-bootstrap-demo,[DEMO SAMPLE — industry template] Content lead sample`,
  ];
  return [header, ...rows].join('\n');
}

export function persistMigrationTemplate(input: {
  ctx: FulfillmentContext;
}): FulfillmentArtifact {
  return persistTextArtifact({
    ctx: input.ctx,
    filename: 'crm-migration-template.csv',
    content: buildMigrationCsv(input.ctx.clientName, {
      industryCategory: input.ctx.industryCategory,
    }),
    type: 'migration_template',
    downloadLabel: 'CRM migration template (CSV)',
  });
}

export function buildTrainingOutlineMarkdown(input: {
  clientName: string;
  industryCategory?: string | null;
}): string {
  const industry = input.industryCategory ?? 'general business';
  return `# Training & onboarding — ${input.clientName}

Industry focus: **${industry}**
Audience: client owner + one ops/admin user
Format: self-serve outline (live calls require a support retainer)

## Checklist — before Session 1
- [ ] Confirm portal login works for owner account
- [ ] Open Billing and Deliveries panels
- [ ] Download setup PDF + CRM migration CSV
- [ ] Note: CRM rows tagged DEMO_SAMPLE are industry templates, not live customer data

## Session 1 — Portal & dashboard (45 min)
1. Login, profile, workspace switcher, notification bell
2. Billing: invoices, payment history, quote panel access
3. Deliveries: download artifacts; verify PDF + markdown packs open
4. Support inbox: how to open a ticket during the 30-day window
5. Acceptance: owner can find billing + notifications without admin help

## Session 2 — CRM & pipeline (45 min)
1. Open CRM contacts; identify \`[DEMO]\` / DEMO_SAMPLE industry templates
2. Import path: use \`crm-migration-template.csv\` (12+ sample rows + primary account)
3. Stages: lead → prospect → customer; when to advance a deal
4. Follow-ups: create a task from a sample lead; assign owner
5. Cleanup: plan which DEMO rows to delete before go-live
6. Acceptance: one real contact imported OR one DEMO row updated with client notes

## Session 3 — Automation module honesty (40 min)
1. Automation **module is enabled** in the portal (entitlement granted)
2. Payment → fulfillment chain is platform-side (already running for purchases)
3. Notifications + tasks fire for portal events you already use
4. External tools (Zapier/Make/n8n, ads APIs, legacy CRM sync) are **NOT CONNECTED** unless separately wired
5. Do **not** tell stakeholders “automations are connected” — say “automation module enabled; external connectors pending”
6. Acceptance: team can list what is live vs NOT CONNECTED

## Session 4 — 30-day support window (20 min)
1. Response target: 24 business hours for in-scope tickets
2. In scope: minor copy/config, import questions, portal navigation
3. Out of scope: unlimited engineering, live training calls, hands-on legacy migration
4. Escalation: reply on kickoff ticket or open a new support ticket in portal

## Day-30 milestone
- [ ] DEMO sample leads removed or clearly quarantined
- [ ] Migration CSV filled with real export (or decision logged to stay on samples)
- [ ] Billing + notifications used at least once by the client team
- [ ] External automation connectors still marked NOT CONNECTED unless Integration package delivered
`;
}

export function trainingOutlineDoc(input: {
  clientName: string;
  industryCategory?: string | null;
}): StructuredDeliverableDoc {
  const industry = input.industryCategory ?? 'general business';
  return {
    title: `Training & onboarding — ${input.clientName}`,
    subtitle: `${industry} · self-serve outline (not live training calls)`,
    sections: [
      {
        heading: 'Session 1 — Portal & dashboard (45 min)',
        body: [
          `Owner login for ${input.clientName}: profile, billing, deliveries, and the notification bell.`,
          'Confirm invoices and downloadable artifacts are visible. Open a practice support ticket so the 30-day window is understood.',
          'Checklist: portal login works; Billing and Deliveries open; setup PDF downloaded.',
          'Acceptance: owner finds billing and notifications without admin help.',
        ].join(' '),
      },
      {
        heading: 'Session 2 — CRM & pipeline (45 min)',
        body: [
          `Industry focus: ${industry}. CRM is seeded with clearly labeled DEMO_SAMPLE / industry template rows (company names prefixed [DEMO]).`,
          'Import path uses the substantial crm-migration-template.csv (12+ rows, stages, tags, source).',
          'Practice advancing lead → prospect → customer and creating a follow-up task.',
          'Milestone: plan which DEMO rows to delete before go-live; optionally import one real contact.',
        ].join(' '),
      },
      {
        heading: 'Session 3 — Automation module honesty (40 min)',
        body: [
          'Automation module entitlement is enabled in the portal. Platform payment → fulfillment already runs for purchases.',
          'External automations (Zapier/Make/n8n, ads APIs, legacy CRM sync) remain NOT CONNECTED unless an Integration package wires them.',
          'Do not claim “automations connected.” Correct language: module enabled; external connectors pending.',
          'Acceptance checklist: team lists live vs NOT CONNECTED capabilities.',
        ].join(' '),
      },
      {
        heading: 'Session 4 — 30-day support window (20 min)',
        body: [
          'Response target: 24 business hours. In scope: minor copy/config, import questions, portal navigation.',
          'Out of scope: unlimited engineering, live training calls, hands-on legacy data migration.',
          'Escalate via portal support ticket. Day-30 milestone: DEMO cleanup decision, real migration path, billing/notifications used once.',
        ].join(' '),
      },
      {
        heading: 'Go-live checklist',
        body: [
          '☐ Remove or quarantine DEMO_SAMPLE leads',
          '☐ Replace template CSV with real export or document stay-on-samples decision',
          '☐ Confirm billing.read access for operators who need invoices',
          '☐ Keep external automation status honest (NOT CONNECTED until wired)',
        ].join('\n'),
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
  const pdf = await persistDeliverablePdf({
    ctx: input.ctx,
    doc,
    artifactType: 'training_outline',
    filename: 'training-outline.pdf',
  });
  return pdf.artifact;
}

export type DeployChecklistItem = {
  id: string;
  title: string;
  owner: 'client' | 'omni' | 'shared';
  status: 'PENDING_CLIENT' | 'PENDING_OMNI' | 'DONE' | 'BLOCKED' | 'SKIPPED';
  commands: string[];
  acceptance: string;
};

export function buildProductionDeployRunbook(input: {
  clientName: string;
  deliverableId: string;
  deployPrep: Record<string, unknown> | null;
}): {
  kind: 'client_executable_runbook';
  clientName: string;
  deliverableId: string;
  generatedAt: string;
  deployPrepStatus: 'skipped' | 'ran' | 'unknown';
  domainSsl: Record<string, unknown>;
  backup: Record<string, unknown>;
  monitoring: Record<string, unknown>;
  sla: Record<string, unknown>;
  honesty: {
    sslProvisioned: boolean;
    domainConfigured: boolean;
    backupLive: boolean;
    monitoringLive: boolean;
    runbookExecutable: boolean;
  };
  checklist: DeployChecklistItem[];
  runbook: string[];
  deployPrep: Record<string, unknown>;
} {
  const prep = input.deployPrep ?? { skipped: true, reason: 'not_run' };
  const skipped = prep.skipped === true;
  const apiBase = String(config.app.url || '').replace(/\/$/, '');
  const webBase = String(config.app.webUrl || '').replace(/\/$/, '');
  const checklist: DeployChecklistItem[] = [
    {
      id: 'dns_a_record',
      title: 'Point production DNS A/AAAA to the target VPS',
      owner: 'client',
      status: 'PENDING_CLIENT',
      commands: [
        '# Replace TARGET_IP with your VPS address',
        `dig +short ${webBase.replace(/^https?:\/\//, '')} A`,
        'nslookup api.example.com',
      ],
      acceptance: 'A/AAAA records resolve to the intended host — not claimed done by fulfillment.',
    },
    {
      id: 'ssl_tls',
      title: 'Provision TLS (Caddy automatic HTTPS or certbot)',
      owner: 'client',
      status: 'PENDING_CLIENT',
      commands: [
        '# Example Caddy: automatic HTTPS when DNS already points at the host',
        'caddy validate --config /etc/caddy/Caddyfile',
        'curl -I https://YOUR_DOMAIN',
      ],
      acceptance: 'HTTPS serves a valid certificate. Fulfillment does NOT mark SSL done.',
    },
    {
      id: 'backup_schedule',
      title: 'Enable daily backup for postgres + uploads',
      owner: 'client',
      status: 'PENDING_CLIENT',
      commands: [
        '# Example: schedule host backup at 02:00 UTC',
        'systemctl list-timers | grep -i backup || echo "configure backup timer"',
      ],
      acceptance: 'Backup job exists with ≥14 day retention for postgres and uploads.',
    },
    {
      id: 'monitoring_health',
      title: 'Wire uptime check to /health and alert email',
      owner: 'shared',
      status: 'PENDING_CLIENT',
      commands: [`curl -fsS ${apiBase || 'https://API_HOST'}/health`, '# Add probe to UptimeRobot/Better Stack/etc.'],
      acceptance: 'External probe returns 2xx and alerts on failure.',
    },
    {
      id: 'sla_runbook',
      title: 'Confirm incident response contacts and 4h target',
      owner: 'shared',
      status: 'PENDING_CLIENT',
      commands: ['# Document on-call contact + escalation path in your ops wiki'],
      acceptance: 'On-call contact listed; 99.5% uptime target acknowledged.',
    },
  ];

  return {
    kind: 'client_executable_runbook',
    clientName: input.clientName,
    deliverableId: input.deliverableId,
    generatedAt: new Date().toISOString(),
    deployPrepStatus: skipped ? 'skipped' : prep.skipped === false ? 'ran' : 'unknown',
    domainSsl: {
      status: 'PENDING_CLIENT',
      note: 'Point DNS A/AAAA to VPS; TLS via Caddy/nginx certbot. Not provisioned by this package automatically.',
      webUrl: config.app.webUrl,
      apiUrl: config.app.url,
      claimedDone: false,
    },
    backup: {
      status: 'PENDING_CLIENT',
      schedule: 'daily 02:00 UTC (client configures)',
      retentionDays: 14,
      targets: ['postgres', 'uploads', 'product-factory output'],
      claimedDone: false,
    },
    monitoring: {
      status: 'PENDING_CLIENT',
      healthEndpoints: [`${apiBase}/health`],
      alertEmail: config.paymentNotifyEmail || config.admin.email,
      claimedDone: false,
    },
    sla: {
      status: 'PENDING_CLIENT',
      uptimeTarget: '99.5%',
      incidentResponseHours: 4,
      claimedDone: false,
      note: 'Target for client ops after checklist execution — not an Omni-operated 24/7 clock.',
    },
    honesty: {
      sslProvisioned: false,
      domainConfigured: false,
      backupLive: false,
      monitoringLive: false,
      runbookExecutable: true,
    },
    checklist,
    runbook: [
      '1. Execute DNS checklist item and wait for propagation.',
      '2. Provision TLS only after DNS points at the host.',
      '3. Enable backup timer; verify a test restore path.',
      '4. Add external /health probe + alert routing.',
      '5. Record on-call contacts; mark checklist items DONE only when verified.',
      skipped
        ? '6. Deploy prep was SKIPPED in automation — this runbook is the deliverable your ops team executes.'
        : '6. Local deploy prep may have been attempted; still verify DNS/SSL/backup yourself before marking DONE.',
    ],
    deployPrep: prep,
  };
}

export function persistProductionDeployManifest(input: {
  ctx: FulfillmentContext;
  deployPrep: Record<string, unknown> | null;
}): FulfillmentArtifact {
  const manifest = buildProductionDeployRunbook({
    clientName: input.ctx.clientName,
    deliverableId: input.ctx.deliverableId,
    deployPrep: input.deployPrep,
  });
  return persistJsonArtifact({
    ctx: input.ctx,
    filename: 'production-deploy-manifest.json',
    type: 'production_deploy_manifest',
    downloadLabel: 'Production deploy runbook (JSON)',
    data: manifest,
  });
}

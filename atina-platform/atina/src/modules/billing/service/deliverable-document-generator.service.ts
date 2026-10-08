import { getAiClient } from '../../../integrations';
import { getDeliverable } from '../lib/deliverable-catalog';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { getIndustryCategory } from '../lib/category-pricing';
import {
  normalizeCategorySlug,
  resolveVerticalSlug,
} from '../../../shared/industry/industry-catalog';
import logger from '../../../utils/logger';
import type { DeliverablePdfSection } from './deliverable-document-pdf.service';
import {
  mergeHintsIntoPayload,
  type FulfillmentGenerationHints,
} from '../lib/fulfillment-generation-hints';
import {
  AI_DOC_ACCEPTANCE_FLOOR,
  assessDocumentQuality,
  documentSubstancePasses,
} from '../lib/deliverable-handlers/artifact-helpers';
import {
  resolveIndustryDocumentSubstance,
  type IndustryDocumentSubstance,
} from '../lib/industry-document-substance';

export type StructuredDeliverableDoc = {
  title: string;
  subtitle?: string;
  sections: DeliverablePdfSection[];
};

type VerticalPack = ReturnType<typeof verticalPackForIndustry>;

/**
 * Resolve either a vertical slug (e.g. healthcare-dental) or a category slug (healthcare).
 * Category-only inputs must NOT fall through to general_business.
 */
function verticalPackForIndustry(industryCategory?: string | null) {
  const raw =
    industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') || 'professional';
  const asVertical = resolveVerticalSlug(raw);
  if (asVertical) {
    return resolveVerticalDeliveryPack({
      slug: asVertical.verticalSlug,
      category: asVertical.category,
      subtype: asVertical.subtype,
      name: asVertical.name,
    });
  }
  const category = normalizeCategorySlug(raw);
  const meta = getIndustryCategory(category);
  return resolveVerticalDeliveryPack({
    slug: meta?.slug ?? category,
    category: meta?.slug ?? category,
    subtype: null,
    name: meta?.name ?? category.replace(/_/g, ' '),
  });
}

function substanceForPack(pack: VerticalPack): IndustryDocumentSubstance {
  return resolveIndustryDocumentSubstance(pack.category || pack.verticalSlug);
}

function bullets(items: string[]): string {
  return items.map((i) => `• ${i}`).join('\n');
}

function numbered(items: string[]): string {
  return items.map((i, idx) => `${idx + 1}. ${i}`).join('\n');
}

function parseDocJson(raw: string): StructuredDeliverableDoc | null {
  try {
    const parsed = JSON.parse(raw) as StructuredDeliverableDoc;
    if (!parsed.title || !Array.isArray(parsed.sections) || parsed.sections.length < 4) return null;
    const ok = parsed.sections.every((s) => s.heading?.trim() && s.body?.trim());
    if (!ok) return null;
    const quality = assessDocumentQuality(parsed);
    if (!documentSubstancePasses(quality, AI_DOC_ACCEPTANCE_FLOOR)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function fallbackAudit(
  clientName: string,
  industry: string,
  pack: VerticalPack,
): StructuredDeliverableDoc {
  const modules = pack.coreModules.join(', ');
  const focus = pack.researchFocus;
  const sub = substanceForPack(pack);
  const industryLabel = sub.labelEn || industry;
  return {
    title: 'Technical & Digital Readiness Audit',
    subtitle: `${clientName} — ${industryLabel}`,
    sections: [
      {
        heading: 'Executive summary',
        body: [
          `${clientName} operates in ${industryLabel} (${sub.categorySlug}). This audit evaluates stack readiness, security posture, conversion funnel integrity, and operational automation maturity against ${pack.displayName} peer benchmarks.`,
          '',
          `${industryLabel}-specific audit lenses:`,
          bullets(sub.auditLenses),
          '',
          'Headline findings (deterministic baseline — refine with live discovery notes):',
          bullets([
            `Primary value thesis: ${pack.valueProp}`,
            `Recommended core modules: ${modules}`,
            `Top research lenses: ${focus.slice(0, 3).join('; ')}`,
            `Domain tokens in scope: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
            '90-day outcome target: portal live, CRM pipeline seeded, first automation closed-loop, measurable lead response SLA',
          ]),
          '',
          `Risk posture (preliminary) for ${industryLabel}: Medium until auth, backup, and payment-confirm paths are evidence-checked. Priority risks:`,
          bullets(sub.operationalRisks.slice(0, 3)),
        ].join('\n'),
      },
      {
        heading: 'Current state assessment',
        body: [
          `Industry focus areas for ${industryLabel}:`,
          bullets(focus.map((f) => `${f} — score current maturity (1–5) and evidence location`)),
          '',
          'Capability scorecard (fill during kickoff):',
          bullets([
            'Identity & access (SSO/MFA, admin least-privilege)',
            'CRM hygiene (stages, owners, SLA clocks)',
            'Outbound/inbound attribution',
            'Billing / fulfillment handoff reliability',
            'Content & SEO basics for acquisition pages',
            ...sub.auditLenses.slice(0, 2).map((l) => `${l} — evidence note`),
          ]),
          '',
          `Quality gates used as acceptance bar:`,
          bullets(pack.qualityGates),
        ].join('\n'),
      },
      {
        heading: 'Security & compliance',
        body: [
          `Checklist for ${industryLabel} — mark each item Pass / Fail / N/A with evidence:`,
          numbered([
            'TLS everywhere (no mixed content); HSTS where applicable',
            'Secrets not in client bundles; rotation cadence documented',
            'Auth: password reset, session expiry, role separation for admin vs client',
            'Backup: encrypted at rest, restore drill within last 90 days',
            'Audit log for payment confirm and privilege changes',
            'Rate limits / abuse controls on public forms and APIs',
            'Dependency and image patch policy for production hosts',
            ...sub.complianceChecklist,
          ]),
          '',
          'Milestone: complete this checklist before any production DNS cutover (Phase 1).',
        ].join('\n'),
      },
      {
        heading: 'Recommended stack & integrations',
        body: [
          `For ${clientName} in ${industryLabel}, prioritize:`,
          bullets([
            `Modules: ${modules}`,
            `Primary offers: ${pack.recommendedDeliverables.map((d) => `${d.name} (€${d.clientPriceEur})`).join('; ') || 'setup + audit follow-ons'}`,
            `Keywords / positioning: ${pack.keywords.slice(0, 8).join(', ')}`,
            ...sub.integrationNotes.slice(0, 2),
          ]),
          '',
          'Integration order (avoid big-bang):',
          numbered([
            'Portal auth + notifications',
            'CRM pipeline + lead source tags',
            'Payment confirm → fulfillment webhook',
            'Outreach / follow-up only after CRM stages are stable',
          ]),
        ].join('\n'),
      },
      {
        heading: '90-day roadmap',
        body: [
          'Phase 1 — Days 1–30 (foundations)',
          bullets([
            'Kickoff + access inventory',
            'Portal/auth smoke tests',
            `Security checklist baseline (${industryLabel} compliance items)`,
            ...sub.setupMilestones.slice(0, 1),
          ]),
          '',
          'Phase 2 — Days 31–60 (revenue path)',
          bullets(pack.workflowSteps.slice(0, 4).map((s) => `${s.step}: ${s.action} (${s.moduleSlug})`)),
          '',
          'Phase 3 — Days 61–90 (scale & measure)',
          bullets([
            ...pack.workflowSteps.slice(4).map((s) => `${s.step}: ${s.action}`),
            `KPI review (${industryLabel}): ${sub.kpiSet.slice(0, 3).join('; ')}`,
            'Acceptance: owner sign-off against quality gates',
          ]),
          '',
          'Milestones:',
          numbered([
            'M1 Go-live checklist green',
            'M2 First closed automation loop',
            'M3 ROI dashboard reviewed with client',
            ...sub.setupMilestones.map((m, i) => `M${i + 4} ${m}`),
          ]),
        ].join('\n'),
      },
      {
        heading: 'ROI estimate & acceptance checklist',
        body: [
          `Conservative model for ${industryLabel} assumes 15–25% operational improvement and reduced admin hours from automation within 90 days. Track weekly KPIs:`,
          bullets(sub.kpiSet),
          '',
          'Acceptance checklist (purchase justification):',
          bullets([
            `☐ Executive summary names client + ${industryLabel}`,
            '☐ Security checklist completed with evidence notes',
            `☐ Industry compliance items covered: ${sub.distinctiveTokens.slice(0, 3).join(', ')}`,
            '☐ Stack recommendations map to activated modules',
            '☐ 90-day roadmap has dated phases + milestones',
            '☐ ROI metrics owners assigned',
            `☐ Outreach hooks validated: ${pack.outreachHooks.slice(0, 2).join(' | ')}`,
          ]),
        ].join('\n'),
      },
      {
        heading: 'Discovery agenda & evidence requests',
        body: [
          `Kickoff discovery for ${clientName} (${industryLabel}) — capture answers with owner + evidence links:`,
          numbered(sub.discoveryQuestions),
          '',
          'Evidence pack to attach before Phase 2:',
          bullets([
            'Current CRM export or stage screenshot',
            'Auth / admin role matrix (who can confirm payments)',
            'Public site URL + analytics property IDs (if any)',
            `Domain risk notes for: ${sub.operationalRisks.slice(0, 2).join('; ')}`,
            `Sales pains to validate: ${sub.salesPains.slice(0, 3).join('; ')}`,
          ]),
          '',
          'Milestone: discovery notes filed in kickoff ticket within 5 business days.',
        ].join('\n'),
      },
      {
        heading: 'Competitive & positioning notes',
        body: [
          `${industryLabel} positioning for ${clientName} against peer SMB benchmarks:`,
          bullets([
            `Value thesis: ${pack.valueProp}`,
            `Keywords to own: ${pack.keywords.slice(0, 10).join(', ')}`,
            `Outreach hooks: ${pack.outreachHooks.join('; ')}`,
            `Distinctive tokens to keep in client copy: ${sub.distinctiveTokens.join(', ')}`,
          ]),
          '',
          'Competitive checklist:',
          bullets([
            '☐ List 3 local/regional peers and their primary CTA',
            '☐ Note pricing transparency (menu / package / quote-only)',
            '☐ Capture review volume + response SLA on Google/Facebook if present',
            `☐ Map peer gaps to ${industryLabel} lenses: ${sub.auditLenses.slice(0, 3).join('; ')}`,
          ]),
          '',
          'Acceptance: positioning one-pager reviewed with owner before paid ads or outbound.',
        ].join('\n'),
      },
    ],
  };
}

function fallbackWorkflow(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  const sub = substanceForPack(pack);
  const industryLabel = sub.labelEn || pack.displayName;
  const stepSections: DeliverablePdfSection[] = pack.workflowSteps.map((s, idx) => ({
    heading: `Process step ${idx + 1}: ${s.step}`,
    body: [
      `Action: ${s.action}`,
      `Primary module: ${s.moduleSlug}`,
      `Owner role: ${idx === 0 ? 'Growth / ops lead' : idx === pack.workflowSteps.length - 1 ? 'Account owner' : 'Specialist + reviewer'}`,
      `SLA: respond or advance stage within ${idx === 0 ? '4 business hours' : '1 business day'}`,
      '',
      `${industryLabel} nuance:`,
      bullets(sub.workflowNuances.slice(0, 2)),
      '',
      'SOP snippet:',
      numbered([
        'Trigger condition documented in CRM or automation rule',
        'Required inputs validated (contact, source, consent)',
        `Execute ${s.action} via ${s.moduleSlug}`,
        'Log outcome + next stage; escalate exceptions to human queue',
      ]),
      '',
      `Tools available in this vertical: ${pack.coreModules.join(', ')}`,
      `Domain tokens: ${sub.distinctiveTokens.slice(0, 3).join(', ')}`,
    ].join('\n'),
  }));

  return {
    title: 'Workflow Design & SOP Pack',
    subtitle: `${clientName} — ${industryLabel}`,
    sections: [
      {
        heading: 'Process map overview',
        body: [
          `${clientName} (${industryLabel}) end-to-end flow:`,
          numbered(pack.workflowSteps.map((s) => `${s.step} → ${s.action}`)),
          '',
          `Value proposition this workflow protects: ${pack.valueProp}`,
          '',
          `${industryLabel} workflow nuances:`,
          bullets(sub.workflowNuances),
          '',
          'RACI (default): Responsible = module operator; Accountable = client admin; Consulted = Omni fulfillment; Informed = finance on paid events.',
        ].join('\n'),
      },
      ...stepSections.slice(0, 4),
      {
        heading: 'Automations, KPIs & rollout checklist',
        body: [
          'Automations to enable after manual dry-run:',
          bullets(pack.workflowSteps.map((s) => `${s.step}: auto-${s.action} with human override`)),
          '',
          `${industryLabel} KPI set:`,
          bullets(sub.kpiSet),
          '',
          'Operational risks to watch:',
          bullets(sub.operationalRisks.slice(0, 3)),
          '',
          'Rollout checklist:',
          bullets([
            '☐ Day 1: map stages in CRM',
            '☐ Day 3: dry-run with sample lead',
            '☐ Week 2: enable first automation',
            '☐ Week 4: KPI review + SOP sign-off',
            ...sub.setupMilestones.map((m) => `☐ Milestone: ${m}`),
            ...pack.qualityGates.map((g) => `☐ Gate: ${g}`),
          ]),
        ].join('\n'),
      },
    ],
  };
}

function fallbackIntegration(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  const sub = substanceForPack(pack);
  const industryLabel = sub.labelEn || pack.displayName;
  return {
    title: 'Custom Integration Guide',
    subtitle: `${clientName} — ${industryLabel}`,
    sections: [
      {
        heading: 'API overview',
        body: [
          `${clientName} (${industryLabel}) integrations should treat Omni REST surfaces as the system of record for payments, deliverables, and portal identity.`,
          '',
          'Scope honesty: this package is a documented map + integration-config.json — tools are NOT already connected until your developer adds API keys.',
          '',
          bullets([
            'Base path: /api/v1 (JWT bearer)',
            'Idempotency: send Idempotency-Key on payment-confirm and webhook retries',
            `Vertical modules in scope: ${pack.coreModules.join(', ')}`,
            `Industry domain tokens: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
            'Error contract: JSON { error, code, requestId } — log requestId for support',
            'Download integration-config.json for envMap, webhookEndpoints, retryPolicy, and onboardingChecklist',
          ]),
          '',
          'Sequence (happy path): Auth → create/update CRM contact → attach payment reference → await payment.completed webhook → unlock deliverable artifacts.',
        ].join('\n'),
      },
      {
        heading: 'Authentication',
        body: [
          numbered([
            'Issue user JWT via login; store refresh token server-side only',
            'Scope admin vs client roles; never embed admin tokens in frontends',
            'Rotate API keys quarterly; revoke on staff offboarding (Day 0 checklist)',
            'Prefer short-lived access tokens (≤1h) with refresh rotation',
          ]),
          '',
          'Acceptance: login, refresh, and forbidden-role probes documented with timestamps.',
        ].join('\n'),
      },
      {
        heading: 'Webhooks',
        body: [
          'Subscribe at minimum to: payment.completed, deliverable.ready, support.ticket.created.',
          '',
          numbered([
            'Verify HMAC signature header before mutating CRM',
            'Return 2xx quickly; process async if heavy',
            'Apply retryPolicy from integration-config.json (exponential backoff + dead-letter)',
            'Map payment_id ↔ external invoice id in a durable table',
          ]),
          '',
          `${industryLabel} integration notes:`,
          bullets(sub.integrationNotes),
          '',
          `Industry note: tag webhook payloads with source=${pack.verticalSlug} for reporting (never embed sensitive ${sub.distinctiveTokens[0]} payloads).`,
        ].join('\n'),
      },
      {
        heading: 'Email, notifications & payments',
        body: [
          bullets([
            'Transactional mail: payment received, deliverable ready, password reset',
            'Admin notify on failed webhook or stuck fulfillment job',
            'Manual bank-transfer path remains first-class; Stripe optional',
            'Never invent merchant IDs — leave placeholders until credentials exist (see envMap)',
          ]),
          '',
          'Payment confirm checklist:',
          bullets([
            '☐ Reference code unique',
            '☐ Amount/currency match quote',
            '☐ Fulfillment job enqueued',
            '☐ Client can download artifacts',
          ]),
        ].join('\n'),
      },
      {
        heading: 'Onboarding when you add API keys',
        body: [
          'Execute this checklist with integration-config.json open (also delivered as integration-onboarding-checklist.md):',
          '',
          numbered([
            'Store webhookSecret as INTEGRATION_WEBHOOK_SECRET in your vault — never commit it',
            'Register webhookEndpoints in Stripe/provider dashboards',
            'Fill only the envMap keys you need (Stripe, email, AI) — unused stay blank',
            'Implement HMAC verify + retryPolicy; send Idempotency-Key on retries',
            'Sandbox E2E: Auth → CRM → payment → artifact unlock using sampleEvents',
            'Production cutover: rotate secrets, swap live keys, monitor 24h',
          ]),
          '',
          `${industryLabel} compliance before cutover:`,
          bullets(sub.complianceChecklist.slice(0, 3).map((c) => `☐ ${c}`)),
          '',
          'Done when: staging E2E green and live keys are not mixed with sandbox.',
        ].join('\n'),
      },
      {
        heading: 'Testing & go-live checklist',
        body: [
          'Quality gates:',
          bullets(pack.qualityGates),
          '',
          'Go-live milestones:',
          numbered([
            'Sandbox webhook echo verified',
            'Staging end-to-end purchase → artifact',
            'Production keys rotated + secrets scan clean',
            'Rollback: disable webhook consumer flag',
            ...sub.setupMilestones,
          ]),
          '',
          'Day-1 ops: monitor error rate, p95 webhook latency, failed fulfillment count.',
        ].join('\n'),
      },
      {
        heading: 'Security & support runbook',
        body: [
          bullets([
            'Rotate webhook secrets after any suspected leak',
            'Rate-limit public endpoints; CAPTCHA on lead forms if abuse appears',
            'Escalation: dashboard support → on-call email → incident channel',
            `ROI hook for ${clientName}: fewer manual reconciliations after webhook automation`,
            ...sub.operationalRisks.slice(0, 2),
          ]),
          '',
          'Acceptance checklist:',
          bullets([
            '☐ Auth probes pass',
            '☐ Webhook signature verified in staging',
            '☐ Payment → deliverable E2E green',
            '☐ Runbook contacts confirmed',
            `☐ ${industryLabel} integration notes reviewed`,
          ]),
        ].join('\n'),
      },
    ],
  };
}

function fallbackSetup(
  tier: 'quick' | 'full' | 'custom',
  clientName: string,
  pack: VerticalPack,
): StructuredDeliverableDoc {
  const sub = substanceForPack(pack);
  const industry = sub.labelEn || pack.displayName;
  const commonKickoff = [
    {
      heading: 'Kickoff scope & owners',
      body: [
        `${clientName} — ${industry} (${sub.categorySlug}) — ${tier} setup tier.`,
        '',
        bullets([
          `Value thesis: ${pack.valueProp}`,
          `Modules to activate: ${pack.coreModules.join(', ')}`,
          `Domain focus: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
          'Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)',
        ]),
        '',
        'Day 1 checklist:',
        bullets([
          '☐ Access list collected',
          '☐ Brand/legal name confirmed',
          `☐ Industry category locked (${sub.categorySlug}) for vertical pack`,
          '☐ Success metric agreed (e.g. first paid delivery < 7 days)',
          ...sub.setupMilestones.slice(0, 2).map((m) => `☐ ${m}`),
        ]),
      ].join('\n'),
    },
  ];

  if (tier === 'quick') {
    return {
      title: 'Quick Setup — Go-Live Checklist',
      subtitle: `${clientName} — ${industry}`,
      sections: [
        ...commonKickoff,
        {
          heading: 'Portal & auth',
          body: [
            numbered([
              'Create client portal user; verify login + password reset email',
              'Confirm admin vs client role separation',
              'Smoke-test session expiry and logout',
              'Bookmark dashboard URL for handoff',
              'Document recovery contacts if MFA/email delivery fails',
            ]),
            '',
            'Acceptance: client can log in without Omni assistance (Milestone M1).',
            `KPI (${industry}): ${sub.kpiSet[0]}`,
          ].join('\n'),
        },
        {
          heading: 'Payments & notifications',
          body: [
            bullets([
              'Manual bank-transfer reference flow tested end-to-end',
              'Admin confirm → fulfillment notification observed',
              'Invoice / receipt email path verified',
              'Contact form delivers to support inbox',
              'Failed-notify path surfaces in admin ops inbox',
            ]),
            '',
            'Day 2 checklist: ☐ payment notify ☐ invoice ☐ contact form ☐ failure alert ☐ client download path',
          ].join('\n'),
        },
        {
          heading: 'CRM seed & industry templates',
          body: [
            `Quick setup seeds labeled DEMO / industry-template CRM rows for ${industry} so the team can practice stages without inventing live leads.`,
            '',
            bullets([
              `Domain focus: ${sub.distinctiveTokens.join(', ')}`,
              'DEMO_SAMPLE tags must remain visible until replaced with a real export',
              'Primary account row kept for the buying contact',
              `Workflow nuances: ${sub.workflowNuances.slice(0, 2).join('; ')}`,
            ]),
            '',
            'Checklist: ☐ open CRM ☐ identify DEMO rows ☐ advance one sample lead ☐ decide import vs stay-on-samples',
            `Milestone: first ${industry} stage practice complete before Day 5 hypercare ends.`,
          ].join('\n'),
        },
        {
          heading: 'Launch & SLA',
          body: [
            numbered([
              'DNS/HTTPS smoke (or hosted path) green',
              'Record go-live timestamp',
              'Share dashboard + this checklist PDF',
              'Agree 5-business-day hypercare window',
              'Schedule Day 5 check-in for open issues',
            ]),
            '',
            `${industry} compliance reminders:`,
            bullets(sub.complianceChecklist.slice(0, 3)),
            '',
            `Industry hooks to mention on handoff: ${pack.outreachHooks.join('; ')}`,
            '',
            'Go-live acceptance: ☐ smoke green ☐ client login ☐ payment path ☐ hypercare calendar invite',
          ].join('\n'),
        },
        {
          heading: 'Day-5 hypercare & acceptance',
          body: [
            `Hypercare window for ${clientName} (${industry}) — close these items before marking setup done:`,
            numbered([
              'Owner can download this PDF from Deliveries without Omni help',
              'Billing invoice / payment history visible to entitled users',
              'Notifications bell shows the welcome / fulfillment notice',
              `KPI snapshot started: ${sub.kpiSet.slice(0, 3).join('; ')}`,
              `Risk watchlist logged: ${sub.operationalRisks.slice(0, 2).join('; ')}`,
            ]),
            '',
            'Day-5 checklist:',
            bullets([
              '☐ Open issues listed with owners',
              '☐ DEMO CRM cleanup decision recorded',
              `☐ Setup milestones: ${sub.setupMilestones.join('; ')}`,
              '☐ Upsell path noted (full onboarding / audit) only if requested',
            ]),
            '',
            'Acceptance: hypercare calendar invite sent; no invented live metrics.',
          ].join('\n'),
        },
        {
          heading: 'Owner runbook & escalation',
          body: [
            `Day-to-day runbook for ${clientName} operators in ${industry}:`,
            numbered([
              'Login → Notifications → Billing → Deliveries (download this PDF + markdown pack)',
              'Confirm any bank-transfer payment from Admin only when reference matches',
              'Open a support ticket with payment/order ID if fulfillment artifacts are missing',
              `Escalate ${industry} compliance questions using: ${sub.complianceChecklist.slice(0, 2).join('; ')}`,
              `Revisit discovery prompts when scope changes: ${sub.discoveryQuestions.slice(0, 2).join('; ')}`,
            ]),
            '',
            'Honesty boundaries (do not oversell):',
            bullets([
              'Portal entitlements + setup PDF are COMPLETE for this package',
              'External ads / Apollo / LinkedIn APIs remain NOT CONNECTED unless separately wired',
              'Custom domain DNS stays with the client registrar',
              `Integration notes for later packages: ${sub.integrationNotes.slice(0, 2).join('; ')}`,
            ]),
            '',
            `Modules referenced: ${pack.coreModules.join(', ')}`,
            `Keywords / positioning: ${pack.keywords.slice(0, 8).join(', ')}`,
            '',
            'Checklist: ☐ operators named ☐ escalation email known ☐ Deliveries download verified ☐ no invented lead counts',
          ].join('\n'),
        },
      ],
    };
  }

  if (tier === 'full') {
    return {
      title: 'Full Onboarding — Implementation Pack',
      subtitle: `${clientName} — ${industry}`,
      sections: [
        ...commonKickoff,
        {
          heading: 'CRM & pipeline',
          body: [
            `Seed pipeline for ${industry} with stages aligned to ${clientName}'s buying motion:`,
            numbered(pack.workflowSteps.map((s) => s.step)),
            '',
            `${industry} workflow nuances:`,
            bullets(sub.workflowNuances),
            '',
            bullets([
              'Assign stage owners and SLA clocks before Week 1 ends',
              'Tag lead source for attribution (never invent live lead counts)',
              'Create at least one DEMO opportunity through to won/lost',
              `Domain tokens to keep on records: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
              `Sales pains to validate: ${sub.salesPains.slice(0, 3).join('; ')}`,
            ]),
            '',
            'Week 1 checklist: ☐ stage owners ☐ SLA clocks ☐ DEMO won/lost ☐ source tags ☐ no fake live leads',
            'Acceptance: ≥1 demo lead per stage + owner assigned (Week 1 milestone).',
          ].join('\n'),
        },
        {
          heading: 'Data migration',
          body: [
            `Migration runbook for ${clientName} (${industry}) — use the CSV template shipped with this pack:`,
            bullets([
              'Use provided CSV migration template (contacts, deals, history)',
              'Map legacy fields → CRM schema before import',
              'Dry-run import on staging; spot-check 10 records',
              'Production import with rollback snapshot',
              'Preserve DEMO_SAMPLE tags until a real export replaces them',
              ...sub.operationalRisks.slice(0, 3).map((r) => `Watch: ${r}`),
            ]),
            '',
            'Phase checklist: ☐ mapping sheet ☐ dry-run ☐ spot-check ☐ prod import ☐ SLA clock starts ☐ rollback tested',
            `Milestone M2: first production import complete for ${industry} contacts.`,
          ].join('\n'),
        },
        {
          heading: 'Automations & training',
          body: [
            'Automation honesty: portal module may be entitled while external connectors stay NOT CONNECTED until keys exist.',
            '',
            bullets([
              'Payment confirm → fulfillment job',
              'Invoice email + task creation',
              'Follow-up sequence after lead stage change',
              'Support ticket open → SLA clock',
              ...sub.integrationNotes.slice(0, 2),
            ]),
            '',
            'Training outline (30–45 min) — NOT CONNECTED systems must be called out verbally:',
            numbered([
              'Portal tour (Notifications, Billing, Deliveries)',
              'CRM stages and DEMO vs live rows',
              'Confirming a payment',
              'Downloading deliverables (this PDF + markdown)',
              'Opening a support ticket',
              ...sub.discoveryQuestions.slice(0, 3).map((q) => `Discuss: ${q}`),
            ]),
            '',
            'Support window: 30 days priority email; response SLA 24h business days.',
            'Checklist: ☐ training booked ☐ attendees named ☐ recording optional ☐ FAQ seed reviewed',
          ].join('\n'),
        },
        {
          heading: 'Quality gates, KPIs & acceptance',
          body: [
            bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
            '',
            `${industry} KPIs:`,
            bullets(sub.kpiSet.map((k) => `☐ Track: ${k}`)),
            '',
            `${industry} compliance reminders:`,
            bullets(sub.complianceChecklist.slice(0, 4).map((c) => `☐ ${c}`)),
            '',
            `Milestones: M1 portal live · M2 CRM seeded · M3 automation dry-run · M4 training complete · ${sub.setupMilestones.map((m, i) => `M${i + 5} ${m}`).join(' · ')}.`,
            '',
            'Day 30 acceptance: ☐ migration signed ☐ training done ☐ KPI baseline ☐ no invented metrics ☐ Deliveries pack verified',
          ].join('\n'),
        },
        {
          heading: '30-day hypercare & owner runbook',
          body: [
            `Hypercare for ${clientName} in ${industry} — close these before marking full onboarding done:`,
            numbered([
              'Owner downloads this PDF + migration CSV + training outline without Omni help',
              'Billing + notifications entitlements verified for entitled users',
              `KPI snapshot started: ${sub.kpiSet.slice(0, 3).join('; ')}`,
              `Risk watchlist logged: ${sub.operationalRisks.slice(0, 2).join('; ')}`,
              'Escalate only with payment/order ID in the support ticket',
            ]),
            '',
            'Honesty boundaries:',
            bullets([
              'CRM DEMO rows are samples — not live harvested leads',
              'Ads / Apollo / LinkedIn APIs remain NOT CONNECTED unless separately wired',
              'Automation module entitled ≠ external automations connected',
              `Integration notes for later packages: ${sub.integrationNotes.slice(0, 2).join('; ')}`,
            ]),
            '',
            `Modules: ${pack.coreModules.join(', ')}`,
            `Keywords: ${pack.keywords.slice(0, 8).join(', ')}`,
            '',
            'Checklist: ☐ operators named ☐ escalation email ☐ Deliveries verified ☐ Week-4 ROI snapshot booked',
          ].join('\n'),
        },
      ],
    };
  }

  return {
    title: 'Custom Production Deploy',
    subtitle: `${clientName} — ${industry}`,
    sections: [
      ...commonKickoff,
      {
        heading: 'Infrastructure',
        body: [
          `Production deploy prep for ${clientName} (${industry}) — client-executable until Omni-managed infra is contracted:`,
          numbered([
            'Provision VPS/Docker prod stack with TLS terminator',
            'Firewall: only 80/443 (+ SSH allowlist)',
            'Automated backups + restore drill documented',
            'Monitoring hooks (uptime + error rate) with alert contacts',
            'Staging parity checklist signed before prod promote',
            `Label env with vertical=${pack.verticalSlug} / category=${sub.categorySlug}`,
          ]),
          '',
          `Domain focus: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
          'Milestone M1: staging parity checklist signed before prod promote.',
          'Checklist: ☐ host sized ☐ TLS path ☐ backup cron ☐ alert contacts ☐ SSH allowlist',
        ].join('\n'),
      },
      {
        heading: 'Security hardening',
        body: [
          bullets([
            'Secrets rotation; no default admin passwords',
            'Rate limits on auth and public APIs',
            'Audit log review cadence (weekly for first month)',
            'Dependency/image patch window defined',
            'Least-privilege service accounts for deploy + backups',
            ...sub.complianceChecklist.slice(0, 4),
          ]),
          '',
          `Operational risks to log for ${industry}:`,
          bullets(sub.operationalRisks.slice(0, 3)),
          '',
          'Day 0 go-live security checklist: ☐ secrets ☐ TLS ☐ backups ☐ alerts ☐ least privilege ☐ compliance notes',
        ].join('\n'),
      },
      {
        heading: 'SLA, ops & handoff',
        body: [
          bullets([
            'Uptime target 99.5% measured monthly',
            'Incident contact matrix + rollback procedure',
            'Runbook + env template + deploy script access for client ops',
            'Honesty: domainConfigured / sslProvisioned stay false until client completes DNS/TLS',
            `Vertical modules: ${pack.coreModules.join(', ')}`,
            `Domain tokens: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
            `Integration notes: ${sub.integrationNotes.slice(0, 2).join('; ')}`,
          ]),
          '',
          'Acceptance: production deploy manifest attached; restore drill date recorded; KPI owners named.',
          'Checklist: ☐ runbook executable ☐ PENDING_* statuses honest ☐ rollback owner ☐ restore drill date',
        ].join('\n'),
      },
      {
        heading: '90-day optimization checklist',
        body: [
          numbered([
            'Week 2: review error budgets',
            'Week 4: automation ROI snapshot',
            'Day 60: capacity / cost review',
            'Day 90: SLA report + next-quarter backlog',
            ...sub.setupMilestones.map((m) => `Track: ${m}`),
          ]),
          '',
          `${industry} KPIs:`,
          bullets(sub.kpiSet),
          '',
          bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
          '',
          `Discovery prompts to revisit: ${sub.discoveryQuestions.slice(0, 3).join('; ')}`,
          '',
          'Day 90 acceptance: ☐ SLA report ☐ cost review ☐ backlog prioritized ☐ no invented uptime claims',
        ].join('\n'),
      },
      {
        heading: 'Client-executable runbook & honesty',
        body: [
          `This custom deploy pack for ${clientName} is COMPLETE as a runbook — not a claim that Omni already configured DNS/SSL.`,
          '',
          numbered([
            'Download production-deploy manifest from Deliveries',
            'Complete PENDING_CLIENT DNS/TLS steps at the registrar',
            'Confirm backups + restore drill date in writing',
            `Apply ${industry} compliance items: ${sub.complianceChecklist.slice(0, 2).join('; ')}`,
            'Open a support ticket with payment ID if any artifact is missing',
          ]),
          '',
          'Honesty boundaries:',
          bullets([
            'sslProvisioned / domainConfigured must remain false until client work is done',
            'External ads / Apollo / LinkedIn stay NOT CONNECTED unless separately wired',
            'Do not invent live lead or uptime metrics in handoff emails',
          ]),
          '',
          `Keywords: ${pack.keywords.slice(0, 8).join(', ')}`,
          'Checklist: ☐ manifest downloaded ☐ PENDING items owned ☐ restore drill dated ☐ escalation path tested',
        ].join('\n'),
      },
    ],
  };
}

function fallbackSales(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  const sub = substanceForPack(pack);
  const industryLabel = sub.labelEn || pack.displayName;
  return {
    title: 'Sales Enablement Pack',
    subtitle: `${clientName} — ${industryLabel}`,
    sections: [
      {
        heading: 'Demo script (15 minutes)',
        body: [
          `Audience: ${industryLabel} buyers for ${clientName}.`,
          '',
          `Open on ${industryLabel} pains:`,
          bullets(sub.salesPains),
          '',
          numbered([
            `0:00–2:00 — Open on pain: ${sub.salesPains[0]}`,
            `2:00–5:00 — Value prop: ${pack.valueProp}`,
            '5:00–9:00 — Live path: portal → pricing → payment reference → deliverable unlock',
            '9:00–12:00 — Show CRM stage + automation handoff',
            '12:00–15:00 — Close: next step = paid package + kickoff date',
          ]),
          '',
          'Talk track hooks:',
          bullets(pack.outreachHooks),
          '',
          `Domain language to use: ${sub.distinctiveTokens.join(', ')}`,
        ].join('\n'),
      },
      {
        heading: 'Discovery questions & objection handling',
        body: [
          `${industryLabel} discovery:`,
          bullets([
            ...sub.discoveryQuestions,
            `Which of these matters most: ${pack.researchFocus.slice(0, 3).join('; ')}?`,
          ]),
          '',
          'Objections:',
          bullets([
            '“We already have a CRM” → We deliver finished workflows + portal, not another login to ignore',
            '“Too expensive” → Anchor to hours saved + faster cash collection; show package ROI checklist',
            '“Need custom” → Path: setup-full → integration → custom-software milestones',
            '“No time” → Quick setup Day-1 checklist; we drive first go-live',
            ...sub.operationalRisks.slice(0, 2).map((r) => `“We are fine” → Counter with risk: ${r}`),
          ]),
        ].join('\n'),
      },
      {
        heading: 'FAQ & offer map',
        body: [
          pack.recommendedDeliverables.length
            ? pack.recommendedDeliverables
                .map((d) => `Q: What is ${d.name}?\nA: From €${d.clientPriceEur} (${d.billing}) — ${d.nameSr}.`)
                .join('\n\n')
            : 'Map packages from catalog: audit, setup, sales-enablement, retainers.',
          '',
          `Positioning keywords: ${pack.keywords.join(', ')}`,
          '',
          `${industryLabel} compliance talking points:`,
          bullets(sub.complianceChecklist.slice(0, 3)),
        ].join('\n'),
      },
      {
        heading: 'Email templates',
        body: [
          'Template A — Intro after demo:',
          `"Hi {{name}}, following our walkthrough for ${clientName} (${industryLabel}): portal + payment + delivery path is ready to activate. Proposed kickoff: {{date}}. Reply YES to lock the slot."`,
          '',
          'Template B — Nudge (Day 3):',
          `"Quick check — still blocked on {{blocker}}? We can start with Quick Setup and expand after first win on ${sub.kpiSet[0]}."`,
          '',
          'Template C — Close (Week 1):',
          `"Sharing the go-live checklist and ROI acceptance items for ${industryLabel}. If we start Monday, Milestone M1 is Friday (${sub.setupMilestones[0]})."`,
        ].join('\n'),
      },
      {
        heading: 'Closing checklist & KPIs',
        body: [
          bullets([
            '☐ Pain confirmed + success metric written',
            '☐ Package selected with price on record',
            '☐ Kickoff date booked',
            '☐ Payment path explained',
            '☐ Champion + economic buyer identified',
            ...pack.qualityGates.map((g) => `☐ ${g}`),
            ...sub.setupMilestones.map((m) => `☐ ${m}`),
          ]),
          '',
          `${industryLabel} sales KPIs: demo→paid conversion, days-to-close, attach rate of setup/audit; plus:`,
          bullets(sub.kpiSet),
        ].join('\n'),
      },
    ],
  };
}

function fallbackSoftwareHandoff(input: {
  clientName: string;
  projectName: string;
  description: string;
  outputDir: string;
  industry?: string;
}): StructuredDeliverableDoc {
  const industry = input.industry ?? 'general business';
  return {
    title: 'Custom Software — Handoff Documentation',
    subtitle: `${input.projectName} — ${input.clientName}`,
    sections: [
      {
        heading: 'Project overview',
        body: [
          input.description.trim() ||
            `Greenfield application for ${input.clientName} (${industry}).`,
          '',
          bullets([
            `Client: ${input.clientName}`,
            `Industry context: ${industry}`,
            `Project: ${input.projectName}`,
            'Stack baseline: Node.js API + static SPA shell (productized starter)',
            'Scope: starter deliverable complete — not unlimited custom build hours',
          ]),
        ].join('\n'),
      },
      {
        heading: 'Delivered artifacts',
        body: [
          numbered([
            'Download software-scaffold.tar.gz from your portal fulfillment artifacts (primary product)',
            `Extract / open: ${input.outputDir}`,
            'README.md — local run + deploy steps',
            '.env.example — copy to .env before start (no secrets committed)',
            'tests/enhanced.test.js — smoke tests; fulfillment records testsPassed from real run',
            'Handoff PDF + markdown bundle for operators',
          ]),
          '',
          'Acceptance: downloadable archive present; testsPassed=true from factory test run; build status completed.',
          'Honesty: a PDF that only names a VPS path is not the product — the tar.gz archive is.',
        ].join('\n'),
      },
      {
        heading: 'How to run the scaffold',
        body: [
          numbered([
            'Download software-scaffold.tar.gz from the portal and extract it locally',
            'cd into the extracted folder (see README inside the archive)',
            'cp .env.example .env  (set JWT_SECRET before shared deploys)',
            'npm test',
            'npm start',
            'Open http://localhost:4100 — curl /health and /api/v1/meta',
          ]),
          '',
          'Day-0 checklist: ☐ archive downloaded ☐ .env filled ☐ npm test green ☐ /health 200 ☐ SPA loads',
        ].join('\n'),
      },
      {
        heading: 'Architecture',
        body: [
          bullets([
            'API routes under src/routes/api.js',
            'Schema / migrations under src/db/schema.sql',
            'Config via env (.env.example) — never hardcode credentials',
            'Static client shell in public/; CORS via CORS_ORIGIN in prod',
            'Health endpoint /health for uptime probes; structured JSON errors',
          ]),
          '',
          'Extend carefully: add feature flags for risky paths; keep healthz for uptime probes.',
          'Architecture acceptance: ☐ route map ☐ env list ☐ no secrets in git ☐ healthz green',
        ].join('\n'),
      },
      {
        heading: 'Deployment runbook',
        body: [
          numbered([
            'Copy tree to host or containerize (Node 20+)',
            'Set PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV=production from .env.example',
            'Apply src/db/schema.sql if using Postgres',
            'npm test && npm start under systemd/PM2/Docker',
            'TLS terminator in front; confirm /health and backup job',
            'Record deploy timestamp and rollback tag',
          ]),
          '',
          'Rollback: previous image/tag + DB migration down plan. Milestone: first prod deploy with monitored error budget.',
          'Day 0 checklist: ☐ env set ☐ migrate ☐ healthz ☐ TLS ☐ backup job scheduled',
        ].join('\n'),
      },
      {
        heading: 'Test plan & milestones',
        body: [
          'Checklist:',
          bullets([
            '☐ Unit/smoke tests green in CI/local (npm test)',
            '☐ Auth happy/fail paths when you add auth',
            '☐ Critical business flow E2E',
            '☐ Backup/restore note for Day 0',
            '☐ Week 2: performance snapshot',
            '☐ Day 30: change-request backlog triage',
          ]),
          '',
          'Milestones: M1 code delivery · M2 deploy · M3 acceptance sign-off.',
        ].join('\n'),
      },
      {
        heading: 'Support & change control',
        body: [
          `Prepared for ${input.clientName}. Route change requests via dashboard support with acceptance criteria and KPI impact.`,
          '',
          bullets([
            'SLA: acknowledge within 1 business day unless retainer says otherwise',
            'Security issues: escalate immediately; rotate secrets if needed',
            'Do not ship with placeholder credentials from .env.example',
          ]),
        ].join('\n'),
      },
    ],
  };
}

export class DeliverableDocumentGeneratorService {
  private async aiDoc(
    system: string,
    payload: Record<string, unknown>,
    fallback: StructuredDeliverableDoc,
    generationHints?: FulfillmentGenerationHints,
  ): Promise<StructuredDeliverableDoc> {
    const ai = getAiClient();
    if (!ai.isConfigured()) return fallback;
    try {
      const chat = await ai.chatCompletions({
        maxTokens: 4500,
        temperature: 0.45,
        messages: [
          {
            role: 'system',
            content: `${system}

Hard requirements: JSON only {"title","subtitle","sections":[{"heading","body"}]}.
Minimum 4 sections; each body ≥ 80 chars; include checklists or numbered milestones.
Name the client and industry. No lorem ipsum. No stub one-liners.`,
          },
          { role: 'user', content: JSON.stringify(mergeHintsIntoPayload(payload, generationHints)) },
        ],
      });
      if (chat?.content) {
        const parsed = parseDocJson(chat.content);
        if (parsed) return parsed;
      }
    } catch (err) {
      logger.warn('AI deliverable document generation failed — fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return fallback;
  }

  async generateAuditReport(input: {
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    const industry = pack.displayName;
    return this.aiDoc(
      `Senior consultant. Sections: Executive summary, Current state, Security, Stack recommendations, 90-day roadmap, ROI & acceptance checklist.`,
      { clientName: input.clientName, industry, verticalPack: pack },
      fallbackAudit(input.clientName, industry, pack),
      input.generationHints,
    );
  }

  async generateWorkflowDesign(input: {
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    return this.aiDoc(
      `Business process architect. Include process map, per-step SOPs with SLA/RACI, automations, KPIs, rollout checklist.`,
      { clientName: input.clientName, workflowSteps: pack.workflowSteps, industry: pack.displayName },
      fallbackWorkflow(input.clientName, pack),
      input.generationHints,
    );
  }

  async generateIntegrationGuide(input: {
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    return this.aiDoc(
      `Integration architect. Sections: API overview, Auth, Webhooks, Email/Payments, Onboarding when you add API keys, Testing & go-live checklist, Security runbook. Never claim tools are already connected.`,
      { clientName: input.clientName, modules: pack.coreModules, industry: pack.displayName },
      fallbackIntegration(input.clientName, pack),
      input.generationHints,
    );
  }

  async generateSetupPack(input: {
    tier: 'quick' | 'full' | 'custom';
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    const fb = fallbackSetup(input.tier, input.clientName, pack);
    return this.aiDoc(
      `DevOps/onboarding lead. Expand ${input.tier} setup with actionable Day/Week checklists, milestones, and industry-specific module activation for ${pack.displayName}.`,
      {
        tier: input.tier,
        clientName: input.clientName,
        industry: pack.displayName,
        modules: pack.coreModules,
        workflowSteps: pack.workflowSteps,
      },
      fb,
      input.generationHints,
    );
  }

  async generateRetainerWelcome(input: {
    deliverableId: string;
    clientName: string;
    industryCategory?: string | null;
  }): Promise<StructuredDeliverableDoc> {
    const d = getDeliverable(input.deliverableId);
    const pack = verticalPackForIndustry(input.industryCategory);
    const sections: DeliverablePdfSection[] = [
      {
        heading: 'What is included',
        body: [
          d?.description ?? 'Monthly retainer services per agreement.',
          '',
          `Industry framing (${pack.displayName}): ${pack.valueProp}`,
        ].join('\n'),
      },
      {
        heading: 'Modules activated',
        body: bullets((d?.modules ?? pack.coreModules).length
          ? (d?.modules ?? pack.coreModules)
          : ['Standard support modules']),
      },
      {
        heading: 'How to reach us',
        body: [
          'Dashboard support tab, kickoff ticket in Tasks, and email per SLA tier. Escalation via admin contact.',
          '',
          'Checklist: ☐ support channel tested ☐ escalation contact saved ☐ first ticket triage SLA understood',
        ].join('\n'),
      },
      {
        heading: 'What you will see in the portal',
        body: bullets([
          'Workspace project linked to this payment',
          'Downloadable welcome PDF + SLA/onboarding pack',
          'Open kickoff support ticket',
          'Deliveries panel with every artifact',
        ]),
      },
      {
        heading: 'Monthly deliverables',
        body: [
          bullets([
            'Performance summary',
            'Pipeline snapshot',
            'Recommended next actions tied to KPIs',
          ]),
          '',
          'Milestone cadence: Week 1 baseline · Week 2 optimizations · Month-end review.',
        ].join('\n'),
      },
      {
        heading: 'Getting started',
        body: [
          numbered(pack.workflowSteps.slice(0, 5).map((s) => `${s.step} (${s.action})`)),
          '',
          bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
        ].join('\n'),
      },
    ];
    if (input.deliverableId === 'lead-gen-retainer') {
      sections.splice(3, 0, {
        heading: 'Channel honesty',
        body: [
          'LinkedIn Ads (LINKEDIN_ADS_*) and Google Ads stay NOT CONNECTED until API credentials and MARKETING_ADS_LIVE_SYNC are configured.',
          'Kickoff still delivers CRM seed, outreach workspace, SLA pack, and a channel status report — never a fake live harvest.',
        ].join('\n'),
      });
    }
    if (input.deliverableId === 'ai-support-retainer') {
      sections.splice(3, 0, {
        heading: 'Avatar honesty',
        body: [
          'RAG knowledge seed and support modules activate immediately.',
          'HeyGen/D-ID video avatar stays NOT CONNECTED until those keys are configured — setup JSON records avatarConfigured truthfully.',
        ].join('\n'),
      });
    }
    return {
      title: `${d?.name ?? 'Retainer'} — Welcome & Service Scope`,
      subtitle: `${input.clientName} — ${pack.displayName}`,
      sections,
    };
  }

  async generateSalesEnablement(input: {
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    return this.aiDoc(
      `Sales enablement lead. Sections: Demo script, Discovery & objections, FAQ/offers, Email templates, Closing checklist & KPIs.`,
      { clientName: input.clientName, hooks: pack.outreachHooks, niche: pack.displayName, pack },
      fallbackSales(input.clientName, pack),
      input.generationHints,
    );
  }

  async generateWhiteLabelPack(input: {
    clientName: string;
    industryCategory?: string | null;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    const niche = pack.displayName;
    return this.aiDoc(
      `Brand strategist. Sections: Brand voice, Partner DNS checklist (partner-owned, not automated), Email setup, Sales collateral, Launch checklist with milestones.`,
      { clientName: input.clientName, industry: niche },
      {
        title: 'White-Label Launch Pack',
        subtitle: `${input.clientName} — ${niche}`,
        sections: [
          {
            heading: 'Brand kit',
            body: [
              `Position ${input.clientName} as a trusted ${niche} delivery partner — not a platform reseller.`,
              '',
              `Value story: ${pack.valueProp}`,
              '',
              bullets([
                'Logo usage: clear space, dark/light variants, favicon, social avatar crop',
                'Primary + accent palette with WCAG AA contrast notes for web and PDF',
                'Type pairing: display for headlines, sans for body, max two families',
                `Tone: confident, specific, outcome-led — ${niche} buyers hate vague SaaS pitch`,
                'Forbidden claims: fake automation, invented staff, unverified delivery dates',
                'Partner one-pager must name the real deliverable SKUs you resell with Omni fulfillment',
              ]),
              '',
              'Milestone: brand kit signed off before any paid ads or cold outreach (Day 0–2).',
            ].join('\n'),
          },
          {
            heading: 'Partner DNS checklist (not automated)',
            body: [
              `Omni does not register or automate custom domain DNS for ${input.clientName}. Your delivered public asset is the hosted partner landing under /sites/{slug}.`,
              '',
              'If you later point your own domain (partner keeps DNS control), use this checklist:',
              '',
              numbered([
                'Choose apex + www strategy (prefer https://www or apex with a single canonical)',
                'Lower TTL, then point A/AAAA or CNAME to the host you control — Omni does not change your registrar',
                'Enable HTTPS on your edge and verify certificate auto-renew',
                'Optional api. subdomain only after TLS is green — do not advertise until live',
                'Keep demos on the Omni /sites/{slug} URL until your custom domain is verified',
              ]),
              '',
              'Checklist: ☐ registrar access ☐ DNS TTL lowered ☐ TLS green ☐ canonical URL decided ☐ /sites landing still works as fallback',
              'Honesty: custom domain is partner-owned configuration — not part of automated white-label delivery.',
            ].join('\n'),
          },
          {
            heading: 'Email identity',
            body: [
              'Outbound identity must match the partner brand. Shared Gmail or Omni inboxes kill trust.',
              '',
              bullets([
                'Primary: hello@ or sales@ on the partner domain via Resend/SMTP',
                'Verify SPF, DKIM, and DMARC (p=none → quarantine as volume grows)',
                'Warm the domain with low-volume 1:1 mail before any sequence >20/day',
                'Keep a shared ops alias for Omni fulfillment updates (not for client-facing sales)',
                'Test: send to Gmail + Outlook + company catch-all; confirm no spam folder',
              ]),
              '',
              'Checklist: ☐ DNS ☐ SPF ☐ DKIM ☐ DMARC ☐ external inbox test ☐ signature with partner brand',
            ].join('\n'),
          },
          {
            heading: 'Partner one-pager & collateral',
            body: [
              `Collateral package for ${niche} conversations — short enough for a call, specific enough to close.`,
              '',
              bullets([
                'Resale positioning pitch (problem → outcome → proof → next step)',
                'Pricing table tied to recommended packages (EUR, delivery model AUTOMATED / CONFIGURATION REQUIRED / HUMAN)',
                'Onboarding email sequence for partner demos (3 touches max)',
                'Objection sheet: timeline, scope boundaries, what is not included',
                ...pack.outreachHooks.slice(0, 4).map((h) => `Hook: ${h}`),
              ]),
              '',
              'Do not invent case studies. Use only verified client results or clearly labeled examples.',
            ].join('\n'),
          },
          {
            heading: 'Launch checklist',
            body: [
              `Week-0 to Week-2 operating checklist for ${input.clientName}.`,
              '',
              bullets([
                '☐ Brand kit approved by partner owner',
                '☐ Landing published and HTTP 200 with partner brand (no Omni chrome)',
                '☐ Email identity verified (SPF/DKIM + external test)',
                '☐ Demo script rehearsed (15 minutes, one CTA)',
                '☐ First 5 target accounts listed with problem + offer',
                '☐ Week 1 pipeline review booked with Omni ops',
                ...pack.qualityGates.slice(0, 4).map((g) => `☐ ${g}`),
              ]),
              '',
              'Exit criteria: partner can send the live URL + one-pager without Omni staff on the call.',
            ].join('\n'),
          },
          {
            heading: 'Handoff & support boundaries',
            body: [
              'What Omni automates vs what the partner owns after launch.',
              '',
              bullets([
                'Automated: partner landing publish at /sites/{slug}, brand PDF pack, fulfillment kickoff for sold SKUs',
                'Partner-owned: legal entity, local pricing markups, human sales calls, custom domain DNS (not automated)',
                'Escalation: support ticket with payment/order ID when a sold package needs rework',
                'Honesty rule: never claim custom domain or LinkedIn/Google Ads live if not configured',
              ]),
              '',
              `Prepared for ${input.clientName} · vertical ${niche} · white-label-setup`,
            ].join('\n'),
          },
        ],
      },
    );
  }

  async generateSiteDeliveryPack(input: {
    deliverableId: string;
    clientName: string;
    industryCategory?: string | null;
    publicUrl: string;
    absoluteUrl: string;
    pageCount?: number | null;
    catalogCount?: number | null;
  }): Promise<StructuredDeliverableDoc> {
    const d = getDeliverable(input.deliverableId);
    const pack = verticalPackForIndustry(input.industryCategory);
    const sub = substanceForPack(pack);
    const industry = sub.labelEn || pack.displayName;
    const kind =
      input.deliverableId === 'website-ecommerce'
        ? 'ecommerce storefront (complete)'
        : input.deliverableId === 'website-business'
          ? 'multi-page business website'
          : 'landing page';
    const sections: DeliverablePdfSection[] = [
      {
        heading: 'What shipped',
        body: [
          `${kind} for ${input.clientName} in ${industry} (${sub.categorySlug}).`,
          `Live URL (path): ${input.publicUrl}`,
          `Open in browser: ${input.absoluteUrl}`,
          input.pageCount ? `Pages generated: ${input.pageCount}` : 'Pages generated: see live site navigation',
          input.catalogCount ? `Catalog products: ${input.catalogCount}` : null,
          '',
          `Value thesis: ${pack.valueProp}`,
          `Domain tokens in copy scope: ${sub.distinctiveTokens.join(', ')}`,
          `Research lenses: ${pack.researchFocus.slice(0, 4).join('; ')}`,
        ]
          .filter((line) => line !== null)
          .join('\n'),
      },
      {
        heading: 'Brand & messaging checklist',
        body: [
          `Confirm the live page reads as ${input.clientName} — not a platform placeholder.`,
          '',
          bullets([
            `☐ Brand/title shows ${input.clientName}`,
            `☐ Primary offer language fits ${industry}`,
            `☐ CTA matches sales path (contact / book / buy)`,
            `☐ Industry phrases present: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
            `☐ Pain points reflected: ${sub.salesPains.slice(0, 3).join('; ')}`,
          ]),
          '',
          'Milestone M1: owner screenshots the hero + CTA for kickoff ticket evidence.',
        ].join('\n'),
      },
      {
        heading: 'How to share with clients',
        body: [
          `Send ${input.absoluteUrl} as your hosted presence under omnigrouptech.com.`,
          'Custom domain DNS is not included — keep this URL or add a redirect / CNAME at your registrar when ready.',
          '',
          'Share checklist:',
          numbered([
            'Paste the absolute URL into email signature and social bios',
            'Add to proposals as “live preview” before custom domain',
            'Share with sales so demos use the same CTA as the site',
            `Mention ${industry} positioning: ${pack.outreachHooks.slice(0, 2).join(' | ')}`,
          ]),
          '',
          'Acceptance: one outbound message with the live URL sent by the client team.',
        ].join('\n'),
      },
      {
        heading: 'SEO & social basics',
        body: [
          'Title/meta and Open Graph tags are set on the published page. Favicon is served from the site shell.',
          '',
          bullets([
            `Primary keywords to monitor: ${pack.keywords.slice(0, 8).join(', ')}`,
            'Verify link previews (Slack/WhatsApp/LinkedIn) after first share',
            'Keep NAP consistent if you also claim Google Business Profile',
            `Avoid inventing review counts or ${industry} certifications not yet earned`,
          ]),
          '',
          'Day-7 checklist: ☐ preview card OK ☐ title unique ☐ no Omni chrome in visible copy',
        ].join('\n'),
      },
      {
        heading: 'Analytics snippet guide (you add the ID)',
        body: [
          'This package prepares placement guidance — it does not create a live analytics property for you.',
          '',
          'Plausible:',
          'Add <script defer data-domain="YOUR_DOMAIN" src="https://plausible.io/js/script.js"></script> via a future content refresh, or track outbound clicks to this URL in your existing analytics.',
          '',
          'GA4:',
          'Create a property, copy Measurement ID (G-XXXX), and paste into your marketing stack when ready. Until then, treat contact CTA clicks as the conversion event.',
          '',
          `${industry} KPIs to wire once analytics is live:`,
          bullets(sub.kpiSet),
          '',
          'Checklist: ☐ property created ☐ ID stored in password manager ☐ goal/event named for primary CTA',
        ].join('\n'),
      },
      {
        heading: 'Retargeting pixel placement guide',
        body: [
          'Meta/Google remarketing pixels require your ad account ID. Do not invent pixel IDs.',
          '',
          numbered([
            'Create the pixel / tag in your ads account',
            'Place it on the live page only after credentials are live',
            'Map the primary CTA as the conversion event',
            `Align creative with ${industry} pains: ${sub.salesPains.slice(0, 2).join('; ')}`,
          ]),
          '',
          'Honesty rule: ads channels remain NOT CONNECTED until you wire keys — the site CTA still works without pixels.',
          'Milestone: pixel plan documented even if install is deferred.',
        ].join('\n'),
      },
      {
        heading: 'Launch QA & acceptance',
        body: [
          `QA gate for ${input.clientName} (${industry}) before paid traffic:`,
          bullets([
            '☐ Mobile viewport: hero + CTA readable without horizontal scroll',
            '☐ Contact / checkout path returns success feedback',
            '☐ No System Admin / Omni Group chrome in visible title or body',
            ...pack.qualityGates.slice(0, 4).map((g) => `☐ ${g}`),
            ...sub.complianceChecklist.slice(0, 2).map((c) => `☐ ${c}`),
          ]),
          '',
          'Acceptance: owner signs kickoff ticket that the live URL is shareable.',
        ].join('\n'),
      },
    ];
    if (input.deliverableId === 'website-ecommerce') {
      sections.push({
        heading: 'Checkout & shop operations',
        body: [
          'Buyers get a live shop page, industry catalog with per-SKU stock, cart, configurable tax/shipping, and a working order path.',
          '',
          bullets([
            'Bank transfer always works (payment reference on each order)',
            'Card checkout uses Stripe TEST when platform keys are configured',
            'Orders create a CRM contact + in-app notification; stock decrements on success',
            `Catalog count shipped: ${input.catalogCount ?? 'see shop page'}`,
            `Industry merchandising tokens: ${sub.distinctiveTokens.slice(0, 4).join(', ')}`,
          ]),
          '',
          'EXTERNAL CONFIGURATION REQUIRED: Stripe LIVE keys and client Stripe Connect / own merchant account are not wired by this package.',
          '',
          'Ops checklist: ☐ place test bank-transfer order ☐ confirm CRM contact ☐ verify stock decrement ☐ record tax/shipping defaults',
        ].join('\n'),
      });
    }
    if (input.deliverableId === 'website-business') {
      sections.push({
        heading: 'Google Business Profile checklist',
        body: [
          `Align GBP with the ${industry} multi-page site for ${input.clientName}:`,
          numbered([
            'Claim GBP for the exact business name',
            'Match NAP to the contact page',
            'Add services/pricing categories from the live site',
            'Link the live URL in the GBP website field',
            'Upload 3+ real photos (client-owned — not stock placeholders)',
            `Reflect differentiators: ${sub.distinctiveTokens.slice(0, 3).join(', ')}`,
          ]),
          '',
          'Milestone: GBP website field points at the hosted URL before local ads.',
        ].join('\n'),
      });
    }
    sections.push({
      heading: '30-day content & CRM follow-through',
      body: [
        `After launch, keep ${industry} momentum without inventing metrics:`,
        bullets([
          ...sub.setupMilestones.map((m) => `☐ ${m}`),
          `☐ Review KPIs weekly: ${sub.kpiSet.slice(0, 3).join('; ')}`,
          `☐ Watch risks: ${sub.operationalRisks.slice(0, 2).join('; ')}`,
          '☐ Log inbound leads in CRM with source = site CTA',
        ]),
        '',
        'Discovery prompts for the first optimization call:',
        numbered(sub.discoveryQuestions.slice(0, 3)),
        '',
        `Vertical focus: ${pack.researchFocus.slice(0, 3).join('; ')}.`,
        'Upsell path (only if requested): custom domain, content refresh retainer, audit, or CRM sync when inbound is live.',
      ].join('\n'),
    });
    sections.push({
      heading: 'Next upgrades',
      body: [
        bullets([
          'Custom domain DNS (client-owned registrar)',
          'Content refresh retainer for seasonal offers',
          `Deeper ${industry} audit if stack/security questions remain`,
          'Integration package when third-party APIs must be wired',
        ]),
        '',
        `Prepared for ${input.clientName} · ${industry} · ${input.deliverableId}`,
        'Honesty: this PDF mirrors the live handoff — downloadable proof in Deliveries, not a one-page stub.',
      ].join('\n'),
    });
    return {
      title: `${d?.name ?? 'Site'} — Delivery pack`,
      subtitle: `${input.clientName} — ${industry}`,
      sections,
    };
  }

  async generateSoftwareHandoff(input: {
    clientName: string;
    projectName: string;
    description: string;
    outputDir: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    const fb = fallbackSoftwareHandoff({
      clientName: input.clientName,
      projectName: input.projectName,
      description: input.description,
      outputDir: input.outputDir,
      industry: pack.displayName,
    });
    return this.aiDoc(
      `Staff engineer writing client handoff. Sections: overview, artifacts, how to run the scaffold, architecture, deployment runbook, test plan & milestones, support. Document npm test/start, .env.example, and deploy steps explicitly.`,
      {
        clientName: input.clientName,
        projectName: input.projectName,
        description: input.description,
        outputDir: input.outputDir,
        industry: pack.displayName,
      },
      fb,
      input.generationHints,
    );
  }

  async generateVerticalPackBrief(input: {
    clientName: string;
    industryCategory?: string | null;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    const sub = substanceForPack(pack);
    const industry = sub.labelEn || pack.displayName;
    return {
      title: `Vertical Solution — ${pack.displayName}`,
      subtitle: `${input.clientName} — ${industry}`,
      sections: [
        {
          heading: 'Value proposition',
          body: [
            pack.valueProp,
            '',
            `Prepared for ${input.clientName} in ${industry} (${sub.categorySlug}).`,
            `Domain focus: ${sub.distinctiveTokens.slice(0, 5).join(', ')}`,
            '',
            'Sales pains this pack addresses:',
            bullets(sub.salesPains.slice(0, 4)),
            '',
            'Milestone M1: align on primary offer + success KPI within kickoff week.',
            'Checklist: ☐ primary offer named ☐ KPI owner ☐ kickoff week booked ☐ no invented live harvest',
          ].join('\n'),
        },
        {
          heading: 'Recommended products',
          body: [
            pack.recommendedDeliverables.length
              ? pack.recommendedDeliverables
                  .map((d) => `• ${d.name} (€${d.clientPriceEur}, ${d.billing}) — ${d.nameSr}`)
                  .join('\n')
              : '• setup-full, audit, vertical-package (see catalog)',
            '',
            `Package quote reference (vertical): €${pack.verticalPackageQuoteEur}`,
            '',
            'Sequencing guidance:',
            numbered([
              'Confirm portal entitlements + CRM DEMO seed (this pack)',
              'Add setup-full / audit if migration or stack review is needed',
              'Keep LinkedIn/Google Ads NOT CONNECTED until API credentials exist',
            ]),
            '',
            'Checklist: ☐ quote understood ☐ sequence agreed ☐ upsell path optional only',
          ].join('\n'),
        },
        {
          heading: 'Implementation workflow',
          body: [
            numbered(pack.workflowSteps.map((s) => `${s.step} — ${s.action} (${s.moduleSlug})`)),
            '',
            `${industry} workflow nuances:`,
            bullets(sub.workflowNuances),
            '',
            'Checklist: ☐ stages in CRM ☐ first automation dry-run ☐ owner training ☐ DEMO vs live rows labeled',
            `Milestone M2: first ${industry} stage practice complete.`,
          ].join('\n'),
        },
        {
          heading: 'Quality gates & compliance',
          body: [
            bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
            '',
            `${industry} compliance reminders:`,
            bullets(sub.complianceChecklist.slice(0, 4).map((c) => `☐ ${c}`)),
            '',
            `Operational risks: ${sub.operationalRisks.slice(0, 3).join('; ')}`,
            '',
            'Acceptance: SLA/onboarding pack + FAQ seed downloaded; kickoff ticket open.',
          ].join('\n'),
        },
        {
          heading: 'Keywords, modules & 90-day focus',
          body: [
            `Keywords: ${pack.keywords.join(', ')}`,
            `Modules: ${pack.coreModules.join(', ')}`,
            '',
            'Research focus:',
            bullets(pack.researchFocus),
            '',
            `${industry} KPIs:`,
            bullets(sub.kpiSet.map((k) => `☐ Track: ${k}`)),
            '',
            'Day 30 / Day 60 / Day 90: review KPI pack and backlog with client.',
            `Setup milestones: ${sub.setupMilestones.join('; ')}`,
            '',
            'Checklist: ☐ Day-30 review ☐ Day-60 backlog ☐ Day-90 ROI ☐ channel honesty restated',
          ].join('\n'),
        },
        {
          heading: 'Kickoff runbook & channel honesty',
          body: [
            `Day-to-day runbook for ${input.clientName} operators:`,
            numbered([
              'Login → Notifications → Billing → Deliveries (download this PDF + SLA pack)',
              'Confirm CRM DEMO seed; do not treat samples as live leads',
              'Use the kickoff support ticket for blockers (include payment/order ID)',
              `Revisit discovery prompts: ${sub.discoveryQuestions.slice(0, 2).join('; ')}`,
              `Integration notes for later wiring: ${sub.integrationNotes.slice(0, 2).join('; ')}`,
            ]),
            '',
            'Honesty boundaries:',
            bullets([
              'LinkedIn Ads / Google Ads / Apollo remain NOT CONNECTED until APIs are wired',
              'Automation module entitled ≠ external automations connected',
              'This vertical pack does not invent harvested lead counts',
            ]),
            '',
            'Checklist: ☐ SLA pack verified ☐ FAQ seed reviewed ☐ operators named ☐ escalation email known',
          ].join('\n'),
        },
      ],
    };
  }
}

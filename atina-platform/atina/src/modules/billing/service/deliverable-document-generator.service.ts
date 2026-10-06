import { getAiClient } from '../../../integrations';
import { getDeliverable } from '../lib/deliverable-catalog';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import { resolveVerticalSlug } from '../../../shared/industry/industry-catalog';
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

export type StructuredDeliverableDoc = {
  title: string;
  subtitle?: string;
  sections: DeliverablePdfSection[];
};

type VerticalPack = ReturnType<typeof verticalPackForIndustry>;

function verticalPackForIndustry(industryCategory?: string | null) {
  const slug = industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
  const resolved = resolveVerticalSlug(slug);
  return resolveVerticalDeliveryPack({
    slug,
    category: resolved?.category ?? 'general_business',
    subtype: resolved?.subtype ?? null,
    name: resolved?.name ?? slug,
  });
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
  return {
    title: 'Technical & Digital Readiness Audit',
    subtitle: `${clientName} — ${industry}`,
    sections: [
      {
        heading: 'Executive summary',
        body: [
          `${clientName} operates in ${industry}. This audit evaluates stack readiness, security posture, conversion funnel integrity, and operational automation maturity against ${pack.displayName} peer benchmarks.`,
          '',
          'Headline findings (deterministic baseline — refine with live discovery notes):',
          bullets([
            `Primary value thesis: ${pack.valueProp}`,
            `Recommended core modules: ${modules}`,
            `Top research lenses: ${focus.slice(0, 3).join('; ')}`,
            '90-day outcome target: portal live, CRM pipeline seeded, first automation closed-loop, measurable lead response SLA',
          ]),
          '',
          'Risk posture (preliminary): Medium until auth, backup, and payment-confirm paths are evidence-checked. Priority is reducing time-to-first-value without expanding attack surface.',
        ].join('\n'),
      },
      {
        heading: 'Current state assessment',
        body: [
          `Industry focus areas for ${industry}:`,
          bullets(focus.map((f) => `${f} — score current maturity (1–5) and evidence location`)),
          '',
          'Capability scorecard (fill during kickoff):',
          bullets([
            'Identity & access (SSO/MFA, admin least-privilege)',
            'CRM hygiene (stages, owners, SLA clocks)',
            'Outbound/inbound attribution',
            'Billing / fulfillment handoff reliability',
            'Content & SEO basics for acquisition pages',
          ]),
          '',
          `Quality gates used as acceptance bar:`,
          bullets(pack.qualityGates),
        ].join('\n'),
      },
      {
        heading: 'Security & compliance',
        body: [
          'Checklist — mark each item Pass / Fail / N/A with evidence:',
          numbered([
            'TLS everywhere (no mixed content); HSTS where applicable',
            'Secrets not in client bundles; rotation cadence documented',
            'Auth: password reset, session expiry, role separation for admin vs client',
            'Backup: encrypted at rest, restore drill within last 90 days',
            'Audit log for payment confirm and privilege changes',
            'PII retention policy reviewed for local regulations',
            'Rate limits / abuse controls on public forms and APIs',
            'Dependency and image patch policy for production hosts',
          ]),
          '',
          'Milestone: complete this checklist before any production DNS cutover (Phase 1).',
        ].join('\n'),
      },
      {
        heading: 'Recommended stack & integrations',
        body: [
          `For ${clientName} in ${industry}, prioritize:`,
          bullets([
            `Modules: ${modules}`,
            `Primary offers: ${pack.recommendedDeliverables.map((d) => `${d.name} (€${d.clientPriceEur})`).join('; ') || 'setup + audit follow-ons'}`,
            `Keywords / positioning: ${pack.keywords.slice(0, 8).join(', ')}`,
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
            'Security checklist baseline',
          ]),
          '',
          'Phase 2 — Days 31–60 (revenue path)',
          bullets(pack.workflowSteps.slice(0, 4).map((s) => `${s.step}: ${s.action} (${s.moduleSlug})`)),
          '',
          'Phase 3 — Days 61–90 (scale & measure)',
          bullets([
            ...pack.workflowSteps.slice(4).map((s) => `${s.step}: ${s.action}`),
            'KPI review: response time, conversion, fulfillment cycle time',
            'Acceptance: owner sign-off against quality gates',
          ]),
          '',
          'Milestones:',
          numbered([
            'M1 Go-live checklist green',
            'M2 First closed automation loop',
            'M3 ROI dashboard reviewed with client',
          ]),
        ].join('\n'),
      },
      {
        heading: 'ROI estimate & acceptance checklist',
        body: [
          'Conservative model for this vertical assumes 15–25% lead-response improvement and reduced admin hours from automation within 90 days. Track weekly: inbound volume, time-to-first-response, paid conversion, fulfillment defects.',
          '',
          'Acceptance checklist (purchase justification):',
          bullets([
            '☐ Executive summary names client + industry',
            '☐ Security checklist completed with evidence notes',
            '☐ Stack recommendations map to activated modules',
            '☐ 90-day roadmap has dated phases + milestones',
            '☐ ROI metrics owners assigned',
            `☐ Outreach hooks validated: ${pack.outreachHooks.slice(0, 2).join(' | ')}`,
          ]),
        ].join('\n'),
      },
    ],
  };
}

function fallbackWorkflow(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  const stepSections: DeliverablePdfSection[] = pack.workflowSteps.map((s, idx) => ({
    heading: `Process step ${idx + 1}: ${s.step}`,
    body: [
      `Action: ${s.action}`,
      `Primary module: ${s.moduleSlug}`,
      `Owner role: ${idx === 0 ? 'Growth / ops lead' : idx === pack.workflowSteps.length - 1 ? 'Account owner' : 'Specialist + reviewer'}`,
      `SLA: respond or advance stage within ${idx === 0 ? '4 business hours' : '1 business day'}`,
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
    ].join('\n'),
  }));

  return {
    title: 'Workflow Design & SOP Pack',
    subtitle: `${clientName} — ${pack.displayName}`,
    sections: [
      {
        heading: 'Process map overview',
        body: [
          `${clientName} (${pack.displayName}) end-to-end flow:`,
          numbered(pack.workflowSteps.map((s) => `${s.step} → ${s.action}`)),
          '',
          `Value proposition this workflow protects: ${pack.valueProp}`,
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
          'KPI set:',
          bullets([
            'Stage conversion %',
            'Median time in stage',
            'Automation success vs manual fallback rate',
            'Client-visible SLA breaches',
          ]),
          '',
          'Rollout checklist:',
          bullets([
            '☐ Day 1: map stages in CRM',
            '☐ Day 3: dry-run with sample lead',
            '☐ Week 2: enable first automation',
            '☐ Week 4: KPI review + SOP sign-off',
            ...pack.qualityGates.map((g) => `☐ Gate: ${g}`),
          ]),
        ].join('\n'),
      },
    ],
  };
}

function fallbackIntegration(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  return {
    title: 'Custom Integration Guide',
    subtitle: `${clientName} — ${pack.displayName}`,
    sections: [
      {
        heading: 'API overview',
        body: [
          `${clientName} integrations should treat Omni REST surfaces as the system of record for payments, deliverables, and portal identity.`,
          '',
          bullets([
            'Base path: /api/v1 (JWT bearer)',
            'Idempotency: send Idempotency-Key on payment-confirm and webhook retries',
            `Vertical modules in scope: ${pack.coreModules.join(', ')}`,
            'Error contract: JSON { error, code, requestId } — log requestId for support',
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
            'Retry policy: exponential backoff; dead-letter after N failures',
            'Map payment_id ↔ external invoice id in a durable table',
          ]),
          '',
          `Industry note (${pack.displayName}): tag webhook payloads with source=${pack.verticalSlug} for reporting.`,
        ].join('\n'),
      },
      {
        heading: 'Email, notifications & payments',
        body: [
          bullets([
            'Transactional mail: payment received, deliverable ready, password reset',
            'Admin notify on failed webhook or stuck fulfillment job',
            'Manual bank-transfer path remains first-class; Stripe optional',
            'Never invent merchant IDs — leave placeholders until credentials exist',
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
          ]),
          '',
          'Acceptance checklist:',
          bullets([
            '☐ Auth probes pass',
            '☐ Webhook signature verified in staging',
            '☐ Payment → deliverable E2E green',
            '☐ Runbook contacts confirmed',
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
  const industry = pack.displayName;
  const commonKickoff = [
    {
      heading: 'Kickoff scope & owners',
      body: [
        `${clientName} — ${industry} — ${tier} setup tier.`,
        '',
        bullets([
          `Value thesis: ${pack.valueProp}`,
          `Modules to activate: ${pack.coreModules.join(', ')}`,
          'Owners: client admin (access), Omni fulfillment (config), finance (payment confirm)',
        ]),
        '',
        'Day 1 checklist:',
        bullets([
          '☐ Access list collected',
          '☐ Brand/legal name confirmed',
          '☐ Industry category locked for vertical pack',
          '☐ Success metric agreed (e.g. first paid delivery < 7 days)',
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
            'KPI: time-to-first-login < 1 business day after kickoff.',
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
            `Industry hooks to mention on handoff: ${pack.outreachHooks.join('; ')}`,
            '',
            'Go-live acceptance: ☐ smoke green ☐ client login ☐ payment path ☐ hypercare calendar invite',
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
            `Seed pipeline for ${industry} with stages aligned to:`,
            numbered(pack.workflowSteps.map((s) => s.step)),
            '',
            bullets([
              'Assign stage owners and SLA clocks',
              'Tag lead source for attribution',
              'Create at least one demo opportunity through to won/lost',
            ]),
            '',
            'Acceptance: ≥1 demo lead per stage + owner assigned (Week 1 milestone).',
          ].join('\n'),
        },
        {
          heading: 'Data migration',
          body: [
            bullets([
              'Use provided CSV migration template (contacts, deals, history)',
              'Map legacy fields → CRM schema before import',
              'Dry-run import on staging; spot-check 10 records',
              'Production import with rollback snapshot',
            ]),
            '',
            'Checklist: ☐ mapping sheet ☐ dry-run ☐ spot-check ☐ prod import ☐ SLA clock starts',
          ].join('\n'),
        },
        {
          heading: 'Automations & training',
          body: [
            bullets([
              'Payment confirm → fulfillment job',
              'Invoice email + task creation',
              'Follow-up sequence after lead stage change',
            ]),
            '',
            'Training outline (30–45 min):',
            numbered([
              'Portal tour',
              'CRM stages',
              'Confirming a payment',
              'Downloading deliverables',
              'Opening a support ticket',
            ]),
            '',
            'Support window: 30 days priority email; response SLA 24h business days.',
          ].join('\n'),
        },
        {
          heading: 'Quality gates & acceptance',
          body: [
            bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
            '',
            'Milestones: M1 portal live · M2 CRM seeded · M3 automation dry-run · M4 training complete.',
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
          numbered([
            'Provision VPS/Docker prod stack with TLS terminator',
            'Firewall: only 80/443 (+ SSH allowlist)',
            'Automated backups + restore drill documented',
            'Monitoring hooks (uptime + error rate) with alert contacts',
          ]),
          '',
          'Milestone M1: staging parity checklist signed before prod promote.',
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
          ]),
          '',
          'Day 0 go-live security checklist: ☐ secrets ☐ TLS ☐ backups ☐ alerts ☐ least privilege',
        ].join('\n'),
      },
      {
        heading: 'SLA, ops & handoff',
        body: [
          bullets([
            'Uptime target 99.5% measured monthly',
            'Incident contact matrix + rollback procedure',
            'Runbook + env template + deploy script access for client ops',
            `Vertical modules: ${pack.coreModules.join(', ')}`,
          ]),
          '',
          'Acceptance: production deploy manifest attached; restore drill date recorded; KPI owners named.',
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
          ]),
          '',
          bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
        ].join('\n'),
      },
    ],
  };
}

function fallbackSales(clientName: string, pack: VerticalPack): StructuredDeliverableDoc {
  return {
    title: 'Sales Enablement Pack',
    subtitle: `${clientName} — ${pack.displayName}`,
    sections: [
      {
        heading: 'Demo script (15 minutes)',
        body: [
          `Audience: ${pack.displayName} buyers for ${clientName}.`,
          '',
          numbered([
            '0:00–2:00 — Open on pain: admin overload / slow follow-up / unclear delivery',
            `2:00–5:00 — Value prop: ${pack.valueProp}`,
            '5:00–9:00 — Live path: portal → pricing → payment reference → deliverable unlock',
            '9:00–12:00 — Show CRM stage + automation handoff',
            '12:00–15:00 — Close: next step = paid package + kickoff date',
          ]),
          '',
          'Talk track hooks:',
          bullets(pack.outreachHooks),
        ].join('\n'),
      },
      {
        heading: 'Discovery questions & objection handling',
        body: [
          'Discovery:',
          bullets([
            'Where do leads stall today?',
            'Who confirms payments / owns follow-up?',
            'What does “done” look like in 30 days?',
            `Which of these matters most: ${pack.researchFocus.slice(0, 3).join('; ')}?`,
          ]),
          '',
          'Objections:',
          bullets([
            '“We already have a CRM” → We deliver finished workflows + portal, not another login to ignore',
            '“Too expensive” → Anchor to hours saved + faster cash collection; show package ROI checklist',
            '“Need custom” → Path: setup-full → integration → custom-software milestones',
            '“No time” → Quick setup Day-1 checklist; we drive first go-live',
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
        ].join('\n'),
      },
      {
        heading: 'Email templates',
        body: [
          'Template A — Intro after demo:',
          `"Hi {{name}}, following our walkthrough for ${clientName}: portal + payment + delivery path is ready to activate. Proposed kickoff: {{date}}. Reply YES to lock the slot."`,
          '',
          'Template B — Nudge (Day 3):',
          `"Quick check — still blocked on {{blocker}}? We can start with Quick Setup and expand after first win."`,
          '',
          'Template C — Close (Week 1):',
          `"Sharing the go-live checklist and ROI acceptance items. If we start Monday, Milestone M1 is Friday."`,
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
          ]),
          '',
          'Sales KPIs: demo→paid conversion, days-to-close, attach rate of setup/audit.',
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
            'Stack baseline: Node.js API + static client shell',
          ]),
        ].join('\n'),
      },
      {
        heading: 'Delivered artifacts',
        body: [
          numbered([
            `Source tree at: ${input.outputDir}`,
            'Local verify: npm test && npm start',
            'Environment template documented (no secrets committed)',
            'Handoff PDF + markdown bundle for operators',
          ]),
          '',
          'Acceptance: tests recorded in fulfillment metadata; build status completed.',
        ].join('\n'),
      },
      {
        heading: 'Architecture',
        body: [
          bullets([
            'API routes under src/routes/ (or project equivalent)',
            'Schema / migrations under src/db/',
            'Config via env — never hardcode credentials',
            'Separate client shell for UI; CORS locked to known origins in prod',
            'Health endpoint for uptime probes; structured error logging',
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
            'Set PORT, DATABASE_URL, JWT/session secrets',
            'Build container or process manager unit',
            'Run migrations; smoke /health',
            'Attach TLS terminator; confirm backups',
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
            '☐ Unit tests green in CI/local',
            '☐ Auth happy/fail paths',
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
            'Do not ship with placeholder credentials',
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
      `Integration architect. Sections: API overview, Auth, Webhooks, Email/Payments, Testing & go-live checklist, Security runbook.`,
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
          'LinkedIn Ads/Marketing and Google Ads stay NOT CONNECTED until API credentials and live sync are configured.',
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
      `Brand strategist. Sections: Brand voice, Domain/DNS, Email setup, Sales collateral, Launch checklist with milestones.`,
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
            heading: 'Domain & DNS',
            body: [
              `Stand up ${input.clientName}'s public hostname before demos so prospects never see an unfinished host.`,
              '',
              numbered([
                'Choose apex + www strategy (prefer https://www or apex with single canonical)',
                'Point A/AAAA or CNAME to the hosting edge Omni publishes for your partner landing',
                'Enable HTTPS (Caddy / Let\'s Encrypt) and verify certificate auto-renew',
                'Optional api. subdomain reserved for future integrations — do not advertise until live',
                'Add a simple /status or health note only after DNS + TLS are green',
              ]),
              '',
              'Checklist: ☐ registrar access ☐ DNS TTL lowered ☐ TLS green ☐ canonical URL decided',
              'Milestone: DNS green before public outreach (Day 0).',
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
                'Pricing table tied to recommended packages (EUR, delivery model AUTOMATED/HYBRID/HUMAN)',
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
                'Automated: partner landing publish, brand PDF pack, fulfillment kickoff for sold SKUs',
                'Partner-owned: legal entity, local pricing markups, human sales calls, custom domain contracts',
                'Escalation: support ticket with payment/order ID when a sold package needs rework',
                'Honesty rule: never claim LinkedIn/Google Ads live if channels are NOT CONNECTED',
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
    const kind =
      input.deliverableId === 'website-ecommerce'
        ? 'ecommerce storefront (HYBRID)'
        : input.deliverableId === 'website-business'
          ? 'multi-page business website'
          : 'landing page';
    const sections: DeliverablePdfSection[] = [
      {
        heading: 'What shipped',
        body: [
          `${kind} for ${input.clientName} (${pack.displayName}).`,
          `Live URL (path): ${input.publicUrl}`,
          `Open in browser: ${input.absoluteUrl}`,
          input.pageCount ? `Pages generated: ${input.pageCount}` : null,
          input.catalogCount ? `Catalog products: ${input.catalogCount}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      },
      {
        heading: 'How to share with clients',
        body: `Send ${input.absoluteUrl} as your hosted presence under omnigrouptech.com. Custom domain DNS is not included — keep the URL or add a redirect at your registrar.`,
      },
      {
        heading: 'SEO & social basics',
        body: 'Title/meta and Open Graph tags are set on the published page. Favicon is served from the site shell. Verify with a link preview tool after you share the URL.',
      },
      {
        heading: 'Analytics snippet guide (you add the ID)',
        body: [
          'Plausible: add <script defer data-domain="YOUR_DOMAIN" src="https://plausible.io/js/script.js"></script> via a future content refresh, or track outbound clicks to this URL in your existing analytics.',
          'GA4: create a property, copy Measurement ID (G-XXXX), and paste into your marketing stack; this package prepares the placement guide, not a live GA property.',
        ].join('\n\n'),
      },
      {
        heading: 'Retargeting pixel placement guide',
        body: 'Meta/Google remarketing pixels require your ad account ID. Place the pixel on the live page only after ads credentials are live — do not invent pixel IDs. Until then, use the contact CTA as the conversion event.',
      },
    ];
    if (input.deliverableId === 'website-ecommerce') {
      sections.push({
        heading: 'Checkout scope (honest HYBRID)',
        body: 'Buyers get a live shop page, industry catalog, cart, and a working order path (bank transfer with payment reference; card checkout when Stripe is enabled for the platform). This is not a full merchant stack: inventory sync, tax engine, shipping carriers, and client Stripe Connect are out of scope unless purchased separately.',
      });
    }
    if (input.deliverableId === 'website-business') {
      sections.push({
        heading: 'Google Business Profile checklist',
        body: '1) Claim GBP for the business name. 2) Match NAP to the contact page. 3) Add services/pricing categories from the live site. 4) Link the live URL in GBP website field. 5) Upload 3+ real photos (client-owned).',
      });
    }
    sections.push({
      heading: 'Next upgrades',
      body: `Vertical focus: ${pack.researchFocus.slice(0, 3).join('; ')}. Upsell path: custom domain, content refresh retainer, or CRM sync when inbound is live.`,
    });
    return {
      title: `${d?.name ?? 'Site'} — Delivery pack`,
      subtitle: `${input.clientName} — ${pack.displayName}`,
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
      `Staff engineer writing client handoff. Sections: overview, artifacts, architecture, deployment runbook, test plan & milestones, support.`,
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
    return {
      title: `Vertical Solution — ${pack.displayName}`,
      subtitle: input.clientName,
      sections: [
        {
          heading: 'Value proposition',
          body: [
            pack.valueProp,
            '',
            `Prepared for ${input.clientName}.`,
            '',
            'Milestone M1: align on primary offer + success KPI within kickoff week.',
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
          ].join('\n'),
        },
        {
          heading: 'Implementation workflow',
          body: [
            numbered(pack.workflowSteps.map((s) => `${s.step} — ${s.action} (${s.moduleSlug})`)),
            '',
            'Checklist: ☐ stages in CRM ☐ first automation dry-run ☐ owner training',
          ].join('\n'),
        },
        {
          heading: 'Quality gates',
          body: bullets(pack.qualityGates.map((g) => `☐ ${g}`)),
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
            'Day 30 / Day 60 / Day 90: review KPI pack and backlog with client.',
          ].join('\n'),
        },
      ],
    };
  }
}

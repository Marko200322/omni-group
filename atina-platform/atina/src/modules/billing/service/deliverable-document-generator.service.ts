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

export type StructuredDeliverableDoc = {
  title: string;
  subtitle?: string;
  sections: DeliverablePdfSection[];
};

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

function parseDocJson(raw: string): StructuredDeliverableDoc | null {
  try {
    const parsed = JSON.parse(raw) as StructuredDeliverableDoc;
    if (!parsed.title || !Array.isArray(parsed.sections) || parsed.sections.length < 3) return null;
    const ok = parsed.sections.every((s) => s.heading?.trim() && s.body?.trim());
    return ok ? parsed : null;
  } catch {
    return null;
  }
}

function fallbackAudit(clientName: string, industry: string, pack: ReturnType<typeof verticalPackForIndustry>): StructuredDeliverableDoc {
  return {
    title: 'Technical & Digital Readiness Audit',
    subtitle: `${clientName} — ${industry}`,
    sections: [
      {
        heading: 'Executive summary',
        body: `${clientName} operates in ${industry}. This audit covers stack readiness, security posture, conversion funnel, and a 90-day roadmap aligned with ${pack.displayName} best practices.`,
      },
      {
        heading: 'Current state assessment',
        body: `Key focus areas: ${pack.researchFocus.join('; ')}. Quality gates: ${pack.qualityGates.join('; ')}.`,
      },
      {
        heading: 'Security & compliance',
        body: 'Review authentication flows, data retention, HTTPS/TLS, secrets management, and backup strategy. Recommend quarterly access reviews and encrypted backups.',
      },
      {
        heading: 'Recommended stack & integrations',
        body: `Core modules for this vertical: ${pack.coreModules.join(', ')}. Primary deliverables to prioritize: ${pack.recommendedDeliverables.map((d) => d.name).join(', ')}.`,
      },
      {
        heading: '90-day roadmap',
        body: pack.workflowSteps.map((s, i) => `${i + 1}. ${s.step} — ${s.action}`).join('\n\n'),
      },
      {
        heading: 'ROI estimate',
        body: 'Conservative ROI assumes 15–25% lead conversion uplift from portal + automation within 90 days. Track MRR, CAC, and time-to-first-value weekly.',
      },
    ],
  };
}

function fallbackSetup(tier: 'quick' | 'full' | 'custom', clientName: string): StructuredDeliverableDoc {
  const tiers = {
    quick: {
      title: 'Quick Setup — Go-Live Checklist',
      sections: [
        { heading: 'Portal & auth', body: 'Client portal live, login, password reset, admin access verified.' },
        { heading: 'Payments', body: 'Manual bank transfer + reference flow tested. Admin confirm workflow documented.' },
        { heading: 'Contact & notifications', body: 'Contact form, payment notify email, invoice delivery tested.' },
        { heading: 'Launch', body: 'DNS, HTTPS, smoke tests green. Handoff to client with dashboard link.' },
      ],
    },
    full: {
      title: 'Full Onboarding — Implementation Pack',
      sections: [
        { heading: 'CRM & pipeline', body: 'Lead capture, stages, and follow-up automations configured for client workflow.' },
        { heading: 'Data migration', body: 'Import template provided; mapping sheet for contacts, deals, and history.' },
        { heading: 'Automations', body: 'Payment confirm → fulfillment, invoice email, task creation wired and tested.' },
        { heading: 'Training', body: '30-minute walkthrough recording outline + admin quick-start PDF included.' },
        { heading: 'Support window', body: '30 days priority email support; response SLA 24h business days.' },
      ],
    },
    custom: {
      title: 'Custom Production Deploy',
      sections: [
        { heading: 'Infrastructure', body: 'VPS/Docker prod stack, TLS, firewall, backups, monitoring hooks.' },
        { heading: 'Security hardening', body: 'Secrets rotation, non-default admin credentials, rate limits, audit log review.' },
        { heading: 'SLA & ops', body: 'Uptime target 99.5%, incident contact, rollback procedure documented.' },
        { heading: 'Handoff', body: 'Runbook, env template, deploy script access, and escalation matrix for client ops team.' },
      ],
    },
  };
  const t = tiers[tier];
  return { title: t.title, subtitle: clientName, sections: t.sections };
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
          { role: 'system', content: system },
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
      `Senior consultant. Reply JSON only: {"title":"...","subtitle":"...","sections":[{"heading":"...","body":"..."}]}
Minimum 6 sections: Executive summary, Current state, Security, Stack recommendations, 90-day roadmap, ROI.
Professional English. No lorem ipsum. Specific to industry and client.`,
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
      `Business process architect. JSON only with 5+ sections: Process map, Automations, SOPs, Roles, KPIs, Rollout plan.`,
      { clientName: input.clientName, workflowSteps: pack.workflowSteps, industry: pack.displayName },
      {
        title: 'Workflow Design & SOP Pack',
        subtitle: input.clientName,
        sections: pack.workflowSteps.map((s) => ({
          heading: s.step,
          body: `${s.action}\n\nModule: ${s.moduleSlug} | Tools: ${pack.coreModules.join(', ')}`,
        })),
      },
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
      `Integration architect. JSON only: sections for API overview, Auth, Webhooks, Email, Payments, Testing checklist.`,
      { clientName: input.clientName, modules: pack.coreModules },
      {
        title: 'Custom Integration Guide',
        subtitle: input.clientName,
        sections: [
          { heading: 'API overview', body: 'REST API at /api/v1 with JWT auth. Rate limits apply per plan.' },
          { heading: 'Authentication', body: 'OAuth2-style login; store refresh tokens securely; rotate keys quarterly.' },
          { heading: 'Webhooks', body: 'Subscribe to payment.completed and deliverable.ready events for CRM sync.' },
          { heading: 'Email & notifications', body: 'Resend/SMTP for transactional mail; templates in admin.' },
          { heading: 'Payments', body: 'Manual confirm flow + optional Stripe/Kriptoman; map references to payment_id.' },
          { heading: 'Testing checklist', body: pack.qualityGates.join('\n') },
        ],
      },
      input.generationHints,
    );
  }

  async generateSetupPack(input: {
    tier: 'quick' | 'full' | 'custom';
    clientName: string;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<StructuredDeliverableDoc> {
    const fb = fallbackSetup(input.tier, input.clientName);
    return this.aiDoc(
      `DevOps/onboarding lead. JSON only. Expand checklist with actionable steps for ${input.tier} tier.`,
      { tier: input.tier, clientName: input.clientName },
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
    return {
      title: `${d?.name ?? 'Retainer'} — Welcome & Service Scope`,
      subtitle: input.clientName,
      sections: [
        { heading: 'What is included', body: d?.description ?? 'Monthly retainer services per agreement.' },
        { heading: 'Modules activated', body: (d?.modules ?? pack.coreModules).join(', ') || 'Standard support modules.' },
        { heading: 'How to reach us', body: 'Dashboard support tab, email response per SLA tier. Escalation via admin contact.' },
        { heading: 'Monthly deliverables', body: 'Performance summary, pipeline snapshot, and recommended next actions.' },
        { heading: 'Getting started', body: pack.workflowSteps.slice(0, 4).map((s) => s.step).join(' → ') },
      ],
    };
  }

  async generateSalesEnablement(input: {
    clientName: string;
    industryCategory?: string | null;
  }): Promise<StructuredDeliverableDoc> {
    const pack = verticalPackForIndustry(input.industryCategory);
    return this.aiDoc(
      `Sales enablement lead. JSON: Demo script, Objection handling, FAQ, Email templates, Closing checklist.`,
      { clientName: input.clientName, hooks: pack.outreachHooks, niche: pack.displayName },
      {
        title: 'Sales Enablement Pack',
        subtitle: input.clientName,
        sections: [
          { heading: 'Demo script (15 min)', body: `Open with pain in ${pack.displayName}. Demo portal → pricing → payment → delivery.` },
          { heading: 'Outreach hooks', body: pack.outreachHooks.join('\n\n') },
          { heading: 'FAQ', body: pack.recommendedDeliverables.map((d) => `Q: ${d.name}?\nA: From €${d.clientPriceEur} — ${d.nameSr}`).join('\n\n') },
          { heading: 'Closing checklist', body: pack.qualityGates.join('\n') },
        ],
      },
    );
  }

  async generateWhiteLabelPack(input: {
    clientName: string;
    industryCategory?: string | null;
  }): Promise<StructuredDeliverableDoc> {
    return this.aiDoc(
      `Brand strategist. JSON: Brand voice, Domain/DNS, Email setup, Sales collateral, Launch checklist.`,
      { clientName: input.clientName, industry: input.industryCategory },
      {
        title: 'White-Label Launch Pack',
        subtitle: input.clientName,
        sections: [
          { heading: 'Brand kit', body: 'Logo usage, primary colors (#1e1b4b, #8b5cf6), typography, tone of voice.' },
          { heading: 'Domain & DNS', body: 'A records, HTTPS via Caddy/Let\'s Encrypt, optional api subdomain.' },
          { heading: 'Email identity', body: 'noreply@yourdomain.com via Resend; verify SPF/DKIM.' },
          {
            heading: 'Partner one-pager',
            body: 'Resale positioning pitch, pricing table, and onboarding email sequence for partner demos.',
          },
          { heading: 'Sales materials', body: 'Collateral checklist: one-pager, FAQ, and launch follow-up.' },
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
        ? 'ecommerce demo storefront'
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
          input.catalogCount ? `Demo catalog products: ${input.catalogCount}` : null,
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
        heading: 'Checkout scope (honest)',
        body: 'This is a demo storefront with sample products and documented cart path. It is not a live Stripe merchant shop, inventory system, or tax engine. Orders use the manual bank-transfer path until merchant checkout is scoped separately.',
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
  }): Promise<StructuredDeliverableDoc> {
    return {
      title: 'Custom Software — Handoff Documentation',
      subtitle: input.projectName,
      sections: [
        { heading: 'Project overview', body: input.description },
        { heading: 'Delivered artifacts', body: `Source code isolated at ${input.outputDir}. Run npm test && npm start locally.` },
        { heading: 'Architecture', body: 'Node.js API + static client shell. Extend routes in src/routes/. Database schema in src/db/schema.sql.' },
        { heading: 'Deployment', body: 'Docker-ready. Set PORT, DATABASE_URL. Deploy to VPS or container platform of choice.' },
        { heading: 'Support', body: `Prepared for ${input.clientName}. Contact via dashboard for change requests.` },
      ],
    };
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
        { heading: 'Value proposition', body: pack.valueProp },
        { heading: 'Recommended products', body: pack.recommendedDeliverables.map((d) => `${d.name} (€${d.clientPriceEur})`).join('\n') },
        { heading: 'Implementation workflow', body: pack.workflowSteps.map((s, i) => `${i + 1}. ${s.step}`).join('\n') },
        { heading: 'Quality gates', body: pack.qualityGates.join('\n') },
        { heading: 'Keywords & positioning', body: pack.keywords.join(', ') },
      ],
    };
  }
}

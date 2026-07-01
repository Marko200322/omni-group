import { getAiClient } from '../../../integrations';
import { getDeliverable } from '../lib/deliverable-catalog';
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import logger from '../../../utils/logger';
import {
  mergeHintsIntoPayload,
  type FulfillmentGenerationHints,
} from '../lib/fulfillment-generation-hints';

export type GeneratedSitePage = {
  slug: string;
  title: string;
  kind: string;
  body: string;
};

const BUSINESS_PAGE_BLUEPRINT: Array<{ slug: string; title: string; kind: string }> = [
  { slug: 'home', title: 'Home', kind: 'home' },
  { slug: 'services', title: 'Services', kind: 'services' },
  { slug: 'about', title: 'About us', kind: 'about' },
  { slug: 'pricing', title: 'Pricing', kind: 'pricing' },
  { slug: 'portfolio', title: 'Portfolio', kind: 'portfolio' },
  { slug: 'faq', title: 'FAQ', kind: 'faq' },
  { slug: 'testimonials', title: 'Testimonials', kind: 'testimonials' },
  { slug: 'blog', title: 'Insights', kind: 'blog' },
  { slug: 'team', title: 'Team', kind: 'team' },
  { slug: 'contact', title: 'Contact', kind: 'contact' },
];

function fallbackPages(title: string, clientName: string, pageCount: number, niche = 'your industry'): GeneratedSitePage[] {
  const blueprint =
    pageCount <= 3
      ? BUSINESS_PAGE_BLUEPRINT.filter((p) => ['home', 'services', 'contact'].includes(p.slug))
      : BUSINESS_PAGE_BLUEPRINT.slice(0, Math.min(pageCount, BUSINESS_PAGE_BLUEPRINT.length));

  return blueprint.map((p) => ({
    ...p,
    body:
      p.kind === 'home'
        ? `Welcome to ${title}. ${clientName} delivers premium ${niche} services with transparent pricing and measurable results.\n\nWe combine strategy, automation, and dedicated support so you can focus on growth.`
        : p.kind === 'contact'
          ? 'Schedule a consultation today. We respond within 24 hours on business days.\n\nEmail, phone, or book a video call — whichever works best for you.'
          : `${p.title} tailored for ${clientName} in ${niche}. Our team brings proven workflows, industry benchmarks, and hands-on implementation.`,
  }));
}

function parsePagesJson(raw: string, expectedMin: number, title: string, clientName: string): GeneratedSitePage[] | null {
  try {
    const parsed = JSON.parse(raw) as { pages?: GeneratedSitePage[] };
    if (!Array.isArray(parsed.pages) || parsed.pages.length < expectedMin) return null;
    const valid = parsed.pages.every(
      (p) => typeof p.slug === 'string' && typeof p.title === 'string' && typeof p.body === 'string'
    );
    if (!valid) return null;
    return parsed.pages.map((p) => ({
      slug: p.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title: p.title.trim(),
      kind: (p.kind ?? p.slug).trim(),
      body: p.body.trim(),
    }));
  } catch {
    return null;
  }
}

export class DeliverableContentGeneratorService {
  async generateWebsitePages(input: {
    deliverableId: string;
    title: string;
    clientName: string;
    industryCategory?: string | null;
    deliverableDescription?: string;
    verticalPack?: VerticalDeliveryPack;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<GeneratedSitePage[]> {
    const deliverable = getDeliverable(input.deliverableId);
    const pageCount =
      input.deliverableId === 'landing'
        ? 1
        : input.deliverableId === 'website-ecommerce'
          ? 8
          : 10;

    const ai = getAiClient();
    const niche = input.verticalPack?.displayName ?? input.industryCategory ?? 'general business';
    const hooks = input.verticalPack?.outreachHooks ?? [];
    const keywords = input.verticalPack?.keywords ?? [];

    if (!ai.isConfigured()) {
      return fallbackPages(input.title, input.clientName, pageCount, niche);
    }

    const blueprint =
      pageCount === 1
        ? [{ slug: 'home', title: 'Home', kind: 'home' }]
        : BUSINESS_PAGE_BLUEPRINT.slice(0, pageCount);

    try {
      const chat = await ai.chatCompletions({
        maxTokens: 6000,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are a senior agency copywriter and UX strategist for premium B2B websites.
Reply with JSON only: {"pages":[{"slug":"...","title":"...","kind":"...","body":"..."}]}
Each body: 3–5 paragraphs, professional English, markdown headings allowed.
Include niche-specific services, social proof tone, clear CTAs, SEO-friendly phrasing.
Use keywords naturally: ${keywords.slice(0, 8).join(', ')}.
No lorem ipsum. Match €${deliverable?.anchorEur ?? 2000}+ premium positioning.`,
          },
          {
            role: 'user',
            content: JSON.stringify(
              mergeHintsIntoPayload(
                {
                  businessName: input.title,
                  clientName: input.clientName,
                  industry: niche,
                  valueProposition: input.verticalPack?.valueProp,
                  outreachAngles: hooks.slice(0, 3),
                  package: deliverable?.name ?? input.deliverableId,
                  packageDescription: input.deliverableDescription ?? deliverable?.description,
                  requiredPages: blueprint,
                  qualityGates: input.verticalPack?.qualityGates ?? [],
                },
                input.generationHints,
              ),
            ),
          },
        ],
      });

      if (chat?.content) {
        const fromAi = parsePagesJson(chat.content, Math.min(3, pageCount), input.title, input.clientName);
        if (fromAi) return fromAi;
      }
    } catch (err) {
      logger.warn('AI website page generation failed — using template fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return fallbackPages(input.title, input.clientName, pageCount, niche);
  }

  async generateProjectBrief(input: {
    deliverableId: string;
    clientName: string;
    industryCategory?: string | null;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<string> {
    const deliverable = getDeliverable(input.deliverableId);
    const base = deliverable?.description ?? input.deliverableId;
    const ai = getAiClient();
    if (!ai.isConfigured()) {
      return `${base} — automated delivery for ${input.clientName}.`;
    }

    try {
      const chat = await ai.chatCompletions({
        maxTokens: 800,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'Write a concise English delivery brief (3–6 sentences) for an automated fulfillment system.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              mergeHintsIntoPayload(
                {
                  deliverable: deliverable?.name ?? input.deliverableId,
                  description: base,
                  clientName: input.clientName,
                  industry: input.industryCategory ?? 'general',
                },
                input.generationHints,
              ),
            ),
          },
        ],
      });
      if (chat?.content?.trim()) return chat.content.trim();
    } catch {
      /* fallback below */
    }
    return `${base} — automated delivery for ${input.clientName}.`;
  }

  generateEcommerceCatalog(input: {
    clientName: string;
    industryCategory?: string | null;
    verticalPack?: VerticalDeliveryPack;
  }): Array<{ id: string; name: string; description: string; priceEur: number; sku: string }> {
    const niche = input.verticalPack?.displayName ?? input.industryCategory ?? 'Premium';
    const baseNames = [
      'Starter package',
      'Professional plan',
      'Business bundle',
      'Premium service',
      'Enterprise kit',
      'Consultation block',
      'Implementation day',
      'Support retainer',
    ];
    const prices = [49, 89, 129, 199, 249, 349, 499, 790];
    return baseNames.map((name, i) => ({
      id: `sku-${i + 1}`,
      sku: `${niche.slice(0, 3).toUpperCase()}-${1000 + i}`,
      name: `${name} — ${niche}`,
      description: `Industry-tuned ${name.toLowerCase()} for ${input.clientName}. Delivered with onboarding support.`,
      priceEur: prices[i] ?? 99,
    }));
  }
}

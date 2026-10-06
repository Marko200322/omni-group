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
  { slug: 'portfolio', title: 'Work', kind: 'portfolio' },
  { slug: 'faq', title: 'FAQ', kind: 'faq' },
  { slug: 'testimonials', title: 'Testimonials', kind: 'testimonials' },
  { slug: 'blog', title: 'Insights', kind: 'blog' },
  { slug: 'team', title: 'Team', kind: 'team' },
  { slug: 'contact', title: 'Contact', kind: 'contact' },
];

const PLACEHOLDER_BRAND =
  /^(system\s*admin(istrator)?|administrator|admin|omni(\s*group)?(\s*tech)?|root|test(\s*user)?|e-?commerce demo( storefront)?|digital presence|client)$/i;

/** True when a name is an internal/admin placeholder, not a client brand. */
export function isPlaceholderBrand(name?: string | null): boolean {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_BRAND.test(trimmed)) return true;
  if (/^(website-|landing|bundle-|setup-|support-)/i.test(trimmed)) return true;
  return false;
}

/** Strip Serbian parentheticals / slug noise → client-facing English niche. */
export function englishNicheLabel(input: {
  verticalPack?: VerticalDeliveryPack | null;
  industryCategory?: string | null;
}): string {
  const pack = input.verticalPack;
  if (pack?.subtype?.trim()) {
    return pack.subtype
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  if (pack?.displayName?.trim()) {
    const cleaned = pack.displayName.split('(')[0]?.trim() ?? pack.displayName.trim();
    if (cleaned && !/[ČĆŽŠĐčćžšđ]/.test(cleaned) && !/\b(pravo|usluge|usluga)\b/i.test(cleaned)) {
      return cleaned;
    }
  }
  if (pack?.category?.trim()) {
    return pack.category
      .replace(/_/g, ' ')
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  const raw = (input.industryCategory ?? '').trim();
  if (!raw) return 'professional services';
  return raw
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Prefer company / real client brand; never System Admin, Omni, or package SKU titles. */
export function resolveClientBrandName(input: {
  clientName?: string | null;
  companyName?: string | null;
  title?: string | null;
  industryCategory?: string | null;
  verticalPack?: VerticalDeliveryPack | null;
}): string {
  const candidates = [input.companyName, input.clientName, input.title];
  for (const raw of candidates) {
    const trimmed = (raw ?? '').trim();
    if (trimmed && !isPlaceholderBrand(trimmed)) return trimmed;
  }
  const niche = englishNicheLabel({
    verticalPack: input.verticalPack,
    industryCategory: input.industryCategory,
  });
  if (niche && niche.toLowerCase() !== 'professional services') {
    const shopLike =
      /e-?commerce|retail|shop|store|marketplace/i.test(
        `${niche} ${input.industryCategory ?? ''} ${input.verticalPack?.category ?? ''}`,
      );
    return `${niche} ${shopLike ? 'Store' : 'Studio'}`;
  }
  return 'Client Store';
}

/** @deprecated Use resolveClientBrandName */
export function resolveClientBrandTitle(input: {
  clientName?: string | null;
  companyName?: string | null;
  fallbackNiche?: string | null;
}): string {
  return resolveClientBrandName({
    clientName: input.clientName,
    companyName: input.companyName,
    industryCategory: input.fallbackNiche,
  });
}

export type SiteContentQuality = {
  ok: boolean;
  pageCount: number;
  minBodyChars: number;
  brandInHome: boolean;
  hasShopPage: boolean;
  omniChrome: boolean;
  thinPages: string[];
  awkwardEnglish: boolean;
};

const OMNI_CHROME_RE =
  /powered by Omni|Omni Group delivery|Omni Group package|Ask Omi|omnigrouptech\.com\/contact/i;
const AWKWARD_EN_RE = /Services\s*\([^)]+\)\s*services|Digital presence\s*[—-]/i;

/** Deterministic content gates for website packages (honest PASS, not template smoke). */
export function assessGeneratedSiteQuality(input: {
  pages: GeneratedSitePage[];
  brandName: string;
  deliverableId: string;
}): SiteContentQuality {
  const brand = input.brandName.trim();
  const pages = input.pages ?? [];
  const homeMin = input.deliverableId === 'landing' ? 420 : 280;
  const secondaryMin = 160;
  const thinPages = pages
    .filter((p) => {
      const isHome = p.kind === 'home' || p.slug === 'home';
      return (p.body?.trim().length ?? 0) < (isHome ? homeMin : secondaryMin);
    })
    .map((p) => p.slug);
  const home = pages.find((p) => p.kind === 'home' || p.slug === 'home');
  const joined = pages.map((p) => p.body).join('\n');
  const omniChrome = OMNI_CHROME_RE.test(joined);
  const awkwardEnglish = AWKWARD_EN_RE.test(joined);
  const brandInHome = Boolean(brand && home?.body && home.body.toLowerCase().includes(brand.toLowerCase()));
  const hasShopPage = pages.some((p) => p.slug === 'shop' || p.kind === 'shop');
  const needShop = input.deliverableId === 'website-ecommerce';
  const minPages =
    input.deliverableId === 'landing' ? 1 : input.deliverableId === 'website-ecommerce' ? 5 : 5;

  const ok =
    pages.length >= minPages &&
    thinPages.length === 0 &&
    brandInHome &&
    !omniChrome &&
    !awkwardEnglish &&
    (!needShop || hasShopPage);

  return {
    ok,
    pageCount: pages.length,
    minBodyChars: homeMin,
    brandInHome,
    hasShopPage,
    omniChrome,
    thinPages,
    awkwardEnglish,
  };
}

type NicheCopy = {
  services: string[];
  outcomes: string[];
  audience: string;
  proof: string;
  products: Array<{ name: string; description: string; priceEur: number }>;
};

function nicheCopyPack(niche: string, category?: string | null): NicheCopy {
  const key = (category ?? niche).toLowerCase().replace(/[\s-]+/g, '_');
  const packs: Record<string, NicheCopy> = {
    fitness: {
      services: [
        'Personal training programs with measurable milestones',
        'Group classes and hybrid online coaching',
        'Nutrition guidance and habit tracking',
        'Corporate wellness workshops',
      ],
      outcomes: ['higher retention', 'clearer onboarding', 'booked intro sessions'],
      audience: 'athletes, busy professionals, and studios that need a credible digital front door',
      proof: 'Members see progress in the first 30 days — or we adjust the plan together.',
      products: [
        { name: 'Intro assessment', description: '60-minute movement screen + goal plan.', priceEur: 49 },
        { name: '4-week starter', description: 'Two sessions/week + habit checklist.', priceEur: 129 },
        { name: '8-week transform', description: 'Coaching, nutrition, and weekly check-ins.', priceEur: 249 },
        { name: 'Monthly membership', description: 'Unlimited class access + app tracking.', priceEur: 89 },
        { name: 'Online coaching', description: 'Remote programming with video form review.', priceEur: 119 },
        { name: 'Corporate wellness day', description: 'On-site workshop for teams (half day).', priceEur: 490 },
        { name: 'Nutrition block', description: 'Four-week meal framework with shopping lists.', priceEur: 99 },
        { name: 'Private PT package', description: '10 one-to-one sessions with progress report.', priceEur: 390 },
      ],
    },
    legal_services: {
      services: [
        'Contract drafting and review with plain-language summaries',
        'GDPR and compliance documentation packs',
        'Business formation and shareholder agreements',
        'Dispute triage and negotiation support',
      ],
      outcomes: ['fewer contract delays', 'audit-ready files', 'clear next steps'],
      audience: 'founders, SMEs, and teams that need reliable legal support without jargon',
      proof: 'Every engagement starts with a scoped brief and written timeline.',
      products: [
        { name: 'Contract review', description: 'Standard commercial agreement review (up to 15 pages).', priceEur: 199 },
        { name: 'Startup pack', description: 'NDA + service agreement + privacy notice.', priceEur: 490 },
        { name: 'GDPR starter', description: 'Processing register + policy templates.', priceEur: 390 },
        { name: 'Hourly counsel', description: 'Advisory block for ongoing questions.', priceEur: 149 },
        { name: 'Shareholder agreement', description: 'Founder agreement with vesting schedule.', priceEur: 790 },
        { name: 'Employment pack', description: 'Offer letter + contract + handbook basics.', priceEur: 349 },
        { name: 'Dispute triage', description: 'Written risk memo and recommended options.', priceEur: 299 },
        { name: 'Retainer (monthly)', description: 'Priority response and document queue.', priceEur: 590 },
      ],
    },
    legal: {
      services: [
        'Commercial contracts and negotiation support',
        'Compliance documentation for regulated work',
        'Client intake and matter intake workflows',
        'Plain-language legal summaries for decision makers',
      ],
      outcomes: ['faster intake', 'cleaner documentation', 'lower review risk'],
      audience: 'businesses that need practical legal delivery, not theater',
      proof: 'Scoped engagements with clear deliverables and response SLAs.',
      products: [
        { name: 'Matter intake', description: 'Structured brief and conflict check.', priceEur: 99 },
        { name: 'Contract review', description: 'Commercial agreement markup + summary.', priceEur: 249 },
        { name: 'Compliance pack', description: 'Policy set tailored to your operations.', priceEur: 490 },
        { name: 'Advisory hour', description: 'Focused counsel on a defined question.', priceEur: 179 },
        { name: 'Template pack', description: 'Reusable NDA, MSA, and SOW templates.', priceEur: 320 },
        { name: 'Dispute memo', description: 'Options analysis with next-step plan.', priceEur: 390 },
        { name: 'Retainer light', description: 'Monthly document queue and Q&A.', priceEur: 690 },
        { name: 'Board briefing', description: 'One-page legal risk briefing for leadership.', priceEur: 220 },
      ],
    },
    ecommerce: {
      services: [
        'Product catalog setup with clear pricing',
        'Checkout and order handoff (bank transfer / card when enabled)',
        'Listing copy and category structure',
        'Post-purchase follow-up and support routing',
      ],
      outcomes: ['faster checkout', 'fewer abandoned carts', 'cleaner catalog'],
      audience: 'brands and stores that need a trustworthy shop front',
      proof: 'Catalog, cart, and order reference flow are live on day one.',
      products: [
        { name: 'Everyday essentials set', description: 'Curated daily-use goods ready to ship.', priceEur: 42 },
        { name: 'Signature product', description: 'Flagship SKU with care card included.', priceEur: 68 },
        { name: 'Home refill pack', description: 'Three-month supply of best movers.', priceEur: 96 },
        { name: 'Gift box', description: 'Presentation-ready selection for gifting.', priceEur: 79 },
        { name: 'Seasonal drop', description: 'Limited run with updated packaging.', priceEur: 54 },
        { name: 'Wholesale carton', description: 'Reseller case pack (12 units).', priceEur: 320 },
        { name: 'Care kit', description: 'Accessories and maintenance supplies.', priceEur: 36 },
        { name: 'Studio bundle', description: 'Multi-item set for professional buyers.', priceEur: 189 },
      ],
    },
    hospitality: {
      services: [
        'Booking-ready landing pages and menus',
        'Event and private dining packages',
        'Guest FAQ and house rules',
        'Seasonal offer campaigns',
      ],
      outcomes: ['more direct bookings', 'clearer guest expectations', 'faster inquiries'],
      audience: 'hotels, restaurants, and venues that want guests to book with confidence',
      proof: 'Guests can understand offers, pricing, and how to reserve in under a minute.',
      products: [
        { name: 'Table for two', description: 'Standard dining reservation deposit.', priceEur: 40 },
        { name: 'Chef tasting', description: 'Five-course tasting menu for two.', priceEur: 129 },
        { name: 'Private dining', description: 'Private room package (up to 8 guests).', priceEur: 390 },
        { name: 'Weekend stay', description: 'Two-night stay with breakfast.', priceEur: 249 },
        { name: 'Event catering', description: 'Buffet package for 20 guests.', priceEur: 690 },
        { name: 'Wine pairing', description: 'Sommelier pairing add-on.', priceEur: 59 },
        { name: 'Brunch package', description: 'Weekend brunch for four.', priceEur: 99 },
        { name: 'Corporate lunch', description: 'Working lunch for 10 guests.', priceEur: 220 },
      ],
    },
    healthcare: {
      services: [
        'Patient-facing service pages with clear intake',
        'Appointment request flow and response SLA',
        'Clinic credentials and care philosophy',
        'Aftercare and FAQ education',
      ],
      outcomes: ['fewer no-shows', 'clearer intake', 'trustworthy first visit'],
      audience: 'clinics and practices that need a professional, calm digital presence',
      proof: 'Patients know what to expect before they book.',
      products: [
        { name: 'Initial consult', description: 'First visit assessment and care plan.', priceEur: 79 },
        { name: 'Follow-up visit', description: 'Progress review and adjustments.', priceEur: 59 },
        { name: 'Care package', description: 'Four-visit package with priority booking.', priceEur: 220 },
        { name: 'Telehealth session', description: 'Remote consult with written summary.', priceEur: 69 },
        { name: 'Diagnostics panel', description: 'Standard screening panel coordination.', priceEur: 149 },
        { name: 'Wellness plan', description: '8-week guided plan with check-ins.', priceEur: 290 },
        { name: 'Family package', description: 'Intake for up to three family members.', priceEur: 199 },
        { name: 'Corporate screening', description: 'On-site screening day for teams.', priceEur: 990 },
      ],
    },
    development_it: {
      services: [
        'Product discovery and technical scoping',
        'Web and API delivery with staged releases',
        'Integrations (CRM, payments, messaging)',
        'Maintenance retainers and incident response',
      ],
      outcomes: ['shipped increments', 'fewer integration surprises', 'documented handoff'],
      audience: 'operators who need working software, not slideware',
      proof: 'Every engagement ends with runnable delivery and a written runbook.',
      products: [
        { name: 'Discovery workshop', description: 'Half-day scope and architecture sketch.', priceEur: 490 },
        { name: 'Landing sprint', description: 'One-week marketing site delivery.', priceEur: 1290 },
        { name: 'Integration day', description: 'Single system integration + tests.', priceEur: 790 },
        { name: 'Bugfix block', description: '8-hour focused remediation block.', priceEur: 390 },
        { name: 'API starter', description: 'CRUD API with auth and docs.', priceEur: 1490 },
        { name: 'Retainer (monthly)', description: 'Ongoing fixes and small features.', priceEur: 990 },
        { name: 'Performance audit', description: 'Load and Core Web Vitals review.', priceEur: 590 },
        { name: 'Handoff pack', description: 'Runbook, credentials map, and training call.', priceEur: 320 },
      ],
    },
    marketing: {
      services: [
        'Positioning and offer messaging',
        'Landing pages and campaign assets',
        'Lead capture and CRM handoff',
        'Monthly performance reviews',
      ],
      outcomes: ['clearer messaging', 'qualified inquiries', 'repeatable campaigns'],
      audience: 'teams that need marketing that converts, not vanity metrics',
      proof: 'Every campaign has a defined CTA, tracking, and a weekly review loop.',
      products: [
        { name: 'Offer rewrite', description: 'Homepage and offer messaging pass.', priceEur: 390 },
        { name: 'Campaign pack', description: 'Landing + 5 creatives + tracking plan.', priceEur: 790 },
        { name: 'SEO sprint', description: 'Technical fixes + 10 page briefs.', priceEur: 690 },
        { name: 'Lead magnet', description: 'Guide + capture form + nurture emails.', priceEur: 490 },
        { name: 'Ads setup', description: 'Account structure and first campaigns.', priceEur: 590 },
        { name: 'Monthly retain', description: 'Content + reporting + iteration.', priceEur: 990 },
        { name: 'Brand kit', description: 'Voice, visuals, and usage rules.', priceEur: 450 },
        { name: 'Funnel audit', description: 'Conversion review with prioritized fixes.', priceEur: 320 },
      ],
    },
  };

  const direct = packs[key];
  if (direct) return direct;

  for (const [k, v] of Object.entries(packs)) {
    if (key.includes(k) || niche.toLowerCase().includes(k.replace(/_/g, ' '))) return v;
  }

  const nicheLower = niche.toLowerCase();
  return {
    services: [
      `${niche} consulting and delivery scoped to your goals`,
      'Clear onboarding with a written plan in the first week',
      'Process automation and CRM follow-up where it saves time',
      'Ongoing support with response targets you can count on',
    ],
    outcomes: ['faster decisions', 'cleaner handoffs', 'measurable delivery'],
    audience: `organizations that need credible ${nicheLower} delivery`,
    proof: 'We start with a scoped brief, milestones, and a single accountable owner.',
    products: [
      { name: `${niche} consult`, description: `60-minute intake focused on ${nicheLower} priorities.`, priceEur: 79 },
      { name: `${niche} audit`, description: `Written review of current process and quick wins.`, priceEur: 190 },
      { name: 'Implementation sprint', description: 'One focused delivery week with acceptance criteria.', priceEur: 690 },
      { name: 'Playbook pack', description: 'SOPs and checklists your team can run without us.', priceEur: 249 },
      { name: 'Training session', description: 'Live team walkthrough with Q&A recording.', priceEur: 320 },
      { name: 'Monthly ops block', description: 'Retainer hours for iteration and support.', priceEur: 390 },
      { name: 'On-site day', description: 'Hands-on configuration and staff enablement.', priceEur: 590 },
      { name: 'Handoff kit', description: 'Credentials map, runbook, and go-live checklist.', priceEur: 180 },
    ],
  };
}

function shopPageBody(brand: string, niche: string, copy: NicheCopy): string {
  return [
    `# Shop — ${brand}`,
    '',
    `Browse ${niche.toLowerCase()} offers from ${brand}. Prices are in EUR. Add items to cart and place an order — checkout uses bank transfer with a payment reference (card checkout when enabled for this store).`,
    '',
    '## Featured offers',
    ...copy.products.slice(0, 4).map((p) => `- **${p.name}** (EUR ${p.priceEur}) — ${p.description}`),
    '',
    '## How ordering works',
    '1. Choose quantities on this page',
    '2. Enter your name and email',
    '3. Place the order and complete payment with the reference you receive',
    '',
    'Working storefront path: catalog, cart, and orders. Inventory sync, tax engine, and client Stripe Connect are separate upgrades.',
  ].join('\n');
}

function landingHomeBody(
  brand: string,
  niche: string,
  copy: NicheCopy,
  prop: string,
): string {
  return [
    `# ${brand}`,
    '',
    prop,
    '',
    `## Why ${brand}`,
    `We specialize in ${niche.toLowerCase()} for ${copy.audience}. ${copy.proof}`,
    '',
    '## Services',
    ...copy.services.map((s) => `- ${s}`),
    '',
    '## Outcomes clients care about',
    ...copy.outcomes.map((o) => `- ${o.charAt(0).toUpperCase() + o.slice(1)}`),
    '',
    '## Proof, not slogans',
    `"${brand} made the process boring in the best way — clear scope, on-time delivery." — Operations lead`,
    '',
    '## Next step',
    'Send a short brief or book an intro call. We reply within one business day with a written scope and EUR pricing.',
  ].join('\n');
}

function fallbackPages(
  brandName: string,
  clientName: string,
  pageCount: number,
  niche: string,
  category?: string | null,
  valueProp?: string | null,
  opts?: { includeShop?: boolean },
): GeneratedSitePage[] {
  const copy = nicheCopyPack(niche, category);
  const brand = brandName.trim() || clientName;
  const rawProp = valueProp?.trim() ?? '';
  const prop =
    rawProp && !/platform resale|CRM, automations/i.test(rawProp)
      ? rawProp
      : `${brand} helps ${copy.audience} achieve ${copy.outcomes.slice(0, 2).join(' and ')}.`;

  const bodies: Record<string, string> = {
    home:
      pageCount <= 1
        ? landingHomeBody(brand, niche, copy, prop)
        : [
            `# ${brand}`,
            '',
            prop,
            '',
            `We specialize in ${niche.toLowerCase()} — practical delivery and transparent pricing. ${copy.proof}`,
            '',
            '## What you get',
            `- Clear scope before work starts`,
            `- ${copy.outcomes.map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(', ')}`,
            `- A single point of contact from kickoff to handoff`,
            '',
            '## Next step',
            'Book an intro call or send a short brief — we respond within one business day.',
          ].join('\n'),
    services: [
      `# Services for ${niche}`,
      '',
      `${brand} delivers finished work — not tool licenses. Typical engagements include:`,
      '',
      ...copy.services.map((s) => `- ${s}`),
      '',
      'Every service comes with written acceptance criteria and a delivery timeline you can share with your team.',
    ].join('\n'),
    about: [
      `# About ${brand}`,
      '',
      `${clientName} built ${brand} to serve ${copy.audience}.`,
      '',
      `Our approach is simple: understand the problem, propose a scoped plan, deliver in visible increments, and leave you with documentation you can operate without us.`,
      '',
      copy.proof,
    ].join('\n'),
    pricing: [
      `# Pricing`,
      '',
      'Transparent packages — customize as needed:',
      '',
      `- **Starter** — focused delivery for a single priority (from EUR ${copy.products[0]?.priceEur ?? 99})`,
      `- **Growth** — multi-week program with check-ins (from EUR ${copy.products[2]?.priceEur ?? 249})`,
      `- **Partner** — ongoing retainer with priority response (from EUR ${copy.products[5]?.priceEur ?? 299})`,
      '',
      'Final quotes are written before work begins. No surprise change orders without your approval.',
    ].join('\n'),
    portfolio: [
      `# Selected work`,
      '',
      `${brand} ships practical ${niche.toLowerCase()} outcomes. Recent engagement patterns:`,
      '',
      `- Discovery → scoped proposal → delivered milestone in under two weeks`,
      `- Catalog / service pages rewritten for clarity and conversion`,
      `- Handoff pack: credentials map, runbook, and training call`,
      '',
      'Ask for anonymized case notes relevant to your industry.',
    ].join('\n'),
    faq: [
      `# FAQ`,
      '',
      '**How fast can we start?** Usually within 3–5 business days after scope sign-off.',
      '',
      '**What do you need from us?** Goals, brand assets (logo/colors if any), and one decision-maker.',
      '',
      '**Is this a template?** No — pages, offers, and catalog are written for your niche and brand name.',
      '',
      '**How do payments work?** Invoices in EUR with a clear payment reference. Shop orders use bank transfer (card checkout when enabled).',
    ].join('\n'),
    testimonials: [
      `# What clients say`,
      '',
      `"${brand} made the process boring in the best way — clear scope, on-time delivery, no chase." — Operations lead`,
      '',
      `"We finally have a site that explains what we do without sounding generic." — Founder`,
      '',
      `"Shop orders and follow-up actually work. The team knows what happens after checkout." — Studio manager`,
    ].join('\n'),
    blog: [
      `# Insights`,
      '',
      `## How ${niche.toLowerCase()} teams waste budget on vague websites`,
      'If visitors cannot tell what you sell in ten seconds, you are paying for decoration.',
      '',
      `## A simple delivery checklist for ${niche.toLowerCase()}`,
      'Scope, proof, pricing, contact path, and one CTA — everything else is optional.',
      '',
      '## Why we publish live URLs before calling a package done',
      'Documents alone are not a website. Clients deserve a working link and an invoice trail.',
    ].join('\n'),
    team: [
      `# Team`,
      '',
      `${brand} is led by ${clientName} with specialist partners for design, delivery, and support in ${niche.toLowerCase()}.`,
      '',
      'You always have one accountable owner. Specialists join when the work needs them — not as a committee.',
      '',
      'Ask for the named delivery owner on your kickoff call so you know who is accountable day to day.',
    ].join('\n'),
    contact: [
      `# Contact ${brand}`,
      '',
      'Tell us what you need and the outcome you want in the next 30–60 days.',
      '',
      '- Response within one business day',
      '- Written proposal before any paid work',
      '- EUR pricing with a clear invoice reference',
      '',
      'Prefer email or a short call — whichever is faster for you.',
    ].join('\n'),
    shop: shopPageBody(brand, niche, copy),
  };

  let blueprint =
    pageCount <= 1
      ? [{ slug: 'home', title: 'Home', kind: 'home' }]
      : pageCount <= 3
        ? BUSINESS_PAGE_BLUEPRINT.filter((p) => ['home', 'services', 'contact'].includes(p.slug))
        : BUSINESS_PAGE_BLUEPRINT.slice(0, Math.min(pageCount, BUSINESS_PAGE_BLUEPRINT.length));

  if (opts?.includeShop && !blueprint.some((p) => p.slug === 'shop')) {
    // Keep Shop early in the nav (right after Home) for storefront UX.
    const home = blueprint[0];
    const rest = blueprint.slice(1);
    blueprint = [
      ...(home ? [home] : []),
      { slug: 'shop', title: 'Shop', kind: 'shop' },
      ...rest.slice(0, Math.max(0, (home ? 6 : 7) - 1)),
    ];
  }

  return blueprint.map((p) => ({
    ...p,
    title: p.kind === 'home' ? brand : p.title,
    body: bodies[p.kind] ?? `${p.title} for ${brand} in ${niche}. ${prop}`,
  }));
}

function parsePagesJson(raw: string, expectedMin: number): GeneratedSitePage[] | null {
  try {
    const parsed = JSON.parse(raw) as { pages?: GeneratedSitePage[] };
    if (!Array.isArray(parsed.pages) || parsed.pages.length < expectedMin) return null;
    const valid = parsed.pages.every(
      (p) => typeof p.slug === 'string' && typeof p.title === 'string' && typeof p.body === 'string',
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
    const niche = englishNicheLabel({
      verticalPack: input.verticalPack,
      industryCategory: input.industryCategory,
    });
    const brandName = resolveClientBrandName({
      clientName: input.clientName,
      title: input.title,
      industryCategory: input.industryCategory,
      verticalPack: input.verticalPack,
    });
    const hooks = input.verticalPack?.outreachHooks ?? [];
    const keywords = input.verticalPack?.keywords ?? [];
    const category = input.verticalPack?.category ?? input.industryCategory ?? null;

    const copy = nicheCopyPack(niche, category);
    const ensureShopPage = (pages: GeneratedSitePage[]): GeneratedSitePage[] => {
      if (input.deliverableId !== 'website-ecommerce') return pages;
      if (pages.some((p) => p.slug === 'shop' || p.kind === 'shop')) return pages;
      return [
        ...pages.slice(0, 1),
        {
          slug: 'shop',
          title: 'Shop',
          kind: 'shop',
          body: shopPageBody(brandName, niche, copy),
        },
        ...pages.slice(1),
      ];
    };

    const fallback = () =>
      ensureShopPage(
        fallbackPages(
          brandName,
          brandName,
          pageCount,
          niche,
          category,
          input.verticalPack?.valueProp,
          { includeShop: input.deliverableId === 'website-ecommerce' },
        ),
      );

    if (!ai.isConfigured()) {
      return fallback();
    }

    const blueprint =
      pageCount === 1
        ? [{ slug: 'home', title: 'Home', kind: 'home' }]
        : input.deliverableId === 'website-ecommerce'
          ? [
              ...BUSINESS_PAGE_BLUEPRINT.slice(0, Math.max(1, pageCount - 1)),
              { slug: 'shop', title: 'Shop', kind: 'shop' },
            ]
          : BUSINESS_PAGE_BLUEPRINT.slice(0, pageCount);

    try {
      const chat = await ai.chatCompletions({
        maxTokens: 6000,
        temperature: 0.45,
        messages: [
          {
            role: 'system',
            content: `You are a senior agency copywriter for premium client websites.
Reply with JSON only: {"pages":[{"slug":"...","title":"...","kind":"...","body":"..."}]}
Rules:
- Brand name is "${brandName}" (client brand). Never use package SKU names as the site title.
- Niche: ${niche}. Write natural English — no Serbian labels in parentheses.
- Each body: 3–5 short paragraphs or markdown sections with headings and bullets.
- Include niche-specific services, social proof tone, clear CTAs, SEO-friendly phrasing.
- Keywords (use naturally): ${keywords.slice(0, 8).join(', ') || niche}.
- No lorem ipsum. No "Digital presence —". No Omni Group marketing speak on client pages.
- Match EUR ${deliverable?.anchorEur ?? 2000}+ premium positioning.`,
          },
          {
            role: 'user',
            content: JSON.stringify(
              mergeHintsIntoPayload(
                {
                  businessName: brandName,
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
        const fromAi = parsePagesJson(chat.content, Math.min(3, pageCount));
        if (fromAi) return ensureShopPage(fromAi);
      }
    } catch (err) {
      logger.warn('AI website page generation failed — using template fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return fallback();
  }

  async generateProjectBrief(input: {
    deliverableId: string;
    clientName: string;
    industryCategory?: string | null;
    verticalPack?: VerticalDeliveryPack;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<string> {
    const deliverable = getDeliverable(input.deliverableId);
    const niche = englishNicheLabel({
      verticalPack: input.verticalPack,
      industryCategory: input.industryCategory,
    });
    const base = deliverable?.description ?? input.deliverableId;
    const ai = getAiClient();
    if (!ai.isConfigured()) {
      return `${base} for ${input.clientName} (${niche}): scoped digital delivery with live site, documentation, and invoice trail.`;
    }

    try {
      const chat = await ai.chatCompletions({
        maxTokens: 800,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              'Write a concise English delivery brief (3–6 sentences) for an automated fulfillment system. Name the client brand and niche. No fluff.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              mergeHintsIntoPayload(
                {
                  deliverable: deliverable?.name ?? input.deliverableId,
                  description: base,
                  clientName: input.clientName,
                  industry: niche,
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
    return `${base} for ${input.clientName} (${niche}): scoped digital delivery with live site, documentation, and invoice trail.`;
  }

  generateEcommerceCatalog(input: {
    clientName: string;
    industryCategory?: string | null;
    verticalPack?: VerticalDeliveryPack;
  }): Array<{ id: string; name: string; description: string; priceEur: number; sku: string }> {
    const niche = englishNicheLabel({
      verticalPack: input.verticalPack,
      industryCategory: input.industryCategory,
    });
    const brand = resolveClientBrandName({
      clientName: input.clientName,
      industryCategory: input.industryCategory,
      verticalPack: input.verticalPack,
    });
    const category = input.verticalPack?.category ?? input.industryCategory ?? null;
    const copy = nicheCopyPack(niche, category);
    const prefix = niche
      .replace(/[^a-zA-Z0-9]+/g, '')
      .slice(0, 4)
      .toUpperCase() || 'PROD';

    return copy.products.slice(0, 8).map((p, i) => ({
      id: `sku-${i + 1}`,
      sku: `${prefix}-${1000 + i}`,
      name: p.name,
      description: `${p.description} Sold by ${brand}.`,
      priceEur: p.priceEur,
    }));
  }
}

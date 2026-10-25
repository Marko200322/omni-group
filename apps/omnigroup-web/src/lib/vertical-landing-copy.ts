import { getIndustryCategory } from './category-pricing';
import { fixPublicAcronyms, formatPublicTitle } from './industry-catalog';
import {
  bindWorkFrame,
  framesForCategory,
  hashSlug,
  nicheWorkNoun,
  pickDistinct,
} from './industry-copy';
import { isRegulatedIndustryCategory } from './regulated-founding-partner';
import { SAAS_PLANS } from './saas-plans';

const ANGLES = [
  'a workspace that keeps this niche on one record',
  'a client portal buyers in this niche can actually log into',
  'AI drafts that stay inside this niche operating process',
  'expert services when this niche needs a human to implement it',
  'subscription plans that match how this niche actually ships',
  'one source of truth for this niche — orders, files, and invoices',
  'scoped delivery packs (setup, audit, or growth) sized for this niche',
  'billing and delivery status that clients in this niche can see without chasing email',
];

function isGenericCatalogBlurb(text: string): boolean {
  return /end-to-end delivery for .+: crm, automations, lead gen/i.test(text);
}

export function buildVerticalLandingCopy(input: {
  slug: string;
  name: string;
  category: string;
  valueProp?: string | null;
}) {
  const seed = hashSlug(input.slug);
  const category = getIndustryCategory(input.category)?.name ?? input.category.replace(/_/g, ' ');
  const name = formatPublicTitle(input.name);
  const work = nicheWorkNoun(input.name);
  const frames = framesForCategory(input.category);
  const selectedFrames = pickDistinct(frames.length ? frames : [`{work} work has no shared record`], seed, 4);
  const pains = selectedFrames
    .slice(0, 3)
    .map((frame) => `${category.toLowerCase()} teams see that ${bindWorkFrame(frame, work)}`);
  const pain = bindWorkFrame(selectedFrames[selectedFrames.length - 1] ?? '{work} work has no shared record', work);
  const angle = ANGLES[seed % ANGLES.length] as string;
  const launch = SAAS_PLANS[0];
  const existing = fixPublicAcronyms(input.valueProp?.trim() ?? '');
  const closers = [
    `Expert services for ${work} are fixed-scope deliverables — portal, docs, or a live page — not a rebuild of the whole practice.`,
    `Add a ${work}-specific package only when you need it; the workspace already covers day-to-day ops.`,
    `Same catalog price book as every other niche — problems and extras change with ${work}, not the SKU list.`,
  ];
  const closer = closers[seed % closers.length] as string;
  const generated = `${work} teams usually stall when ${pain}. Omni Group gives ${category} operators ${angle}, starting from ${launch.name} at €${launch.monthly.EUR} / $${launch.monthly.USD} per month. ${closer}`;
  const lede = existing.length >= 80 && !isGenericCatalogBlurb(existing) ? existing : generated;
  const headlines = [
    `${name}: ${work} operations for ${category} teams`,
    `Run ${work} in ${category} without losing the last handoff`,
    `${name} — one ${category} workspace`,
    `A quieter ${category} system for ${work}`,
  ];

  return {
    eyebrow: category,
    headline: headlines[seed % headlines.length] as string,
    lede,
    pains,
    saasLine: `Start on ${launch.name} for ${work}, then add a scoped expert service if this ${category.toLowerCase()} niche needs a done-for-you setup.`,
    regulated: isRegulatedIndustryCategory(input.category),
    painSource: frames.length ? ('category' as const) : ('generic' as const),
    workNoun: work,
  };
}

/** Legacy platform plan metadata — INTERNAL ONLY, not sold publicly. Use deliverable-catalog for client pricing. */
import {
  BASE_PLAN_PRICES,
  formatEur,
  getPlanPriceForCategory,
  type PlanSlug,
} from './category-pricing';

export { formatEur };

export type MarketingPlan = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: 'EUR';
  highlight: boolean;
  forWho: string;
  features: string[];
  cta: string;
  href: string;
};

const MARKETING_PLAN_META: Omit<MarketingPlan, 'priceMonthly' | 'priceYearly'>[] = [
  {
    slug: 'starter',
    name: 'Poslovni',
    tagline: 'Za preduzetnike i solo timove',
    currency: 'EUR',
    highlight: false,
    forWho: 'Vlasnik firme, freelancer ili mala agencija koja želi jedan panel umesto haosa u Excelu i Viberu.',
    features: [
      'Klijentski dashboard i nalog',
      'Osnovni CRM i obaveštenja',
      'Manual / bankovna uplata (bez firme na Stripe)',
      'Email podrška',
      '1 korisnik · do 50 taskova mesečno',
    ],
    cta: 'Započni — Poslovni',
    href: '/login?next=/dashboard%23billing',
  },
  {
    slug: 'pro',
    name: 'Rast',
    tagline: 'Za timove koji automatizuju prodaju i operacije',
    currency: 'EUR',
    highlight: true,
    forWho: 'Firme sa 3–15 ljudi koje prodaju usluge, vode klijente i hoće AI podršku + automatizacije.',
    features: [
      'Sve iz Poslovnog paketa',
      'Automatizacije, ugovori, analitika',
      'Web scraper i CRM pipeline',
      'AI avatar podrška i prodaja',
      'Do 10 članova tima',
    ],
    cta: 'Najpopularnije — Rast',
    href: '/login?next=/dashboard%23billing',
  },
  {
    slug: 'enterprise',
    name: 'Partner',
    tagline: 'Za veće timove i white-label partnere',
    currency: 'EUR',
    highlight: false,
    forWho: 'Agencije, veći SMB i partneri koji prodaju platformu pod svojim brendom.',
    features: [
      'Svi moduli platforme',
      'White-label i prioritetna podrška',
      'Neograničen broj taskova',
      'SLA i custom integracije po dogovoru',
      'Onboarding sa našim timom',
    ],
    cta: 'Dogovori demo',
    href: '/contact',
  },
];

/** Base marketing plans (standard tier / bez kategorije). */
export const MARKETING_PLANS: MarketingPlan[] = MARKETING_PLAN_META.map((meta) => ({
  ...meta,
  priceMonthly: BASE_PLAN_PRICES[meta.slug].monthly,
  priceYearly: BASE_PLAN_PRICES[meta.slug].yearly,
}));

/** Plans adjusted for an industry category (healthcare, retail, …). */
export function getMarketingPlansForCategory(industryCategory?: string | null): MarketingPlan[] {
  return MARKETING_PLAN_META.map((meta) => ({
    ...meta,
    priceMonthly: getPlanPriceForCategory(meta.slug, 'monthly', industryCategory),
    priceYearly: getPlanPriceForCategory(meta.slug, 'yearly', industryCategory),
  }));
}

export const IMPLEMENTATION_ADDONS = [
  {
    name: 'Brzo podešavanje',
    price: '€290',
    once: true,
    desc: 'Env, login, manual billing, kontakt forma — spremno za prve klijente za 1–2 dana.',
  },
  {
    name: 'Pun onboarding',
    price: '€890',
    once: true,
    desc: 'Migracija podataka, CRM, automatizacije, obuka tima i 30 dana podrške.',
  },
  {
    name: 'Custom projekat',
    price: 'od €2.490',
    once: true,
    desc: 'Integracije, custom workflow, deploy na tvom domenu i SLA.',
  },
];

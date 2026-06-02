/** Javni cenovnik — usklađen sa Atina planovima (starter / pro / enterprise). */
export type MarketingPlan = {
  slug: 'starter' | 'pro' | 'enterprise';
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

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    slug: 'starter',
    name: 'Poslovni',
    tagline: 'Za preduzetnike i solo timove',
    priceMonthly: 39,
    priceYearly: 390,
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
    priceMonthly: 99,
    priceYearly: 990,
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
    priceMonthly: 249,
    priceYearly: 2490,
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

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

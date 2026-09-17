/** Kanonska lista — sync sa docs/STATUS-KANON.md */

export type KanonStatus = 'DONE' | 'READY' | 'TI' | 'BLOCKED' | 'DEFERRED' | 'CANCELLED' | 'N/A' | 'PARTIAL';

export type KanonItem = {
  id: string;
  title: string;
  status: KanonStatus;
  owner?: string;
  note?: string;
  link?: string;
};

export type KanonSection = {
  id: string;
  title: string;
  subtitle?: string;
  items: KanonItem[];
};

export const STATUS_KANON_UPDATED = '2026-09-17';

export const KANON_SECTIONS: KanonSection[] = [
  {
    id: 'live',
    title: 'LIVE — potvrđeno',
    subtitle: 'Ne diraj — radi na produkciji',
    items: [
      { id: 'LIVE-01', title: 'Site + API · M6 · full · €250', status: 'DONE', link: 'https://omnigrouptech.com' },
      { id: 'LIVE-02', title: 'Fulfillment 850/850', status: 'DONE' },
      { id: 'LIVE-03', title: 'Stripe TEST + prices + webhook', status: 'DONE' },
      { id: 'LIVE-04', title: 'Instantly + Resend + Hunter + OpenRouter + Apify', status: 'DONE' },
      { id: 'LIVE-05', title: 'Apollo · NB · ZB · Snov · D-ID · HeyGen · Cartesia', status: 'DONE' },
      { id: 'LIVE-06', title: 'SMTP + invoice PDF path', status: 'DONE' },
      { id: 'LIVE-07', title: 'Zoom join URL (3 kanala)', status: 'DONE' },
      { id: 'LIVE-08', title: 'GitHub main protection · VPS backup', status: 'DONE' },
      { id: 'LIVE-09', title: 'Rollback owner (Marko Kosic)', status: 'DONE' },
      { id: 'LIVE-10', title: 'Email DNS: Resend DKIM + SPF', status: 'DONE' },
      { id: 'LIVE-11', title: 'n8n outreach stub (nije live send)', status: 'DONE' },
      { id: 'LIVE-12', title: 'Legal stranice u kodu', status: 'DONE' },
      { id: 'LIVE-13', title: 'Redizajn UI', status: 'CANCELLED', note: 'Odbijen 2026-09-17' },
    ],
  },
  {
    id: 'p0',
    title: 'P0 — Pre „sve spremno“',
    subtitle: 'Samo ti: DNS panel · provider UI · E2E',
    items: [
      { id: 'P0-01', title: 'DMARC TXT u Spaceship', status: 'TI', owner: 'Ti', link: '/dev/docs#sec-dns-email-auth-md', note: 'scripts/add-dmarc-spaceship.ps1' },
      { id: 'P0-02', title: 'Resend Domains → Verify u UI', status: 'TI', owner: 'Ti' },
      { id: 'P0-03', title: 'Instantly UI: potvrdi warmup', status: 'TI', owner: 'Ti' },
      { id: 'P0-04', title: 'Slack webhook — kontakt form', status: 'TI', owner: 'Ti', note: 'CONTACT_SLACK_WEBHOOK_URL' },
      { id: 'P0-05', title: 'Slack webhook — ops', status: 'TI', owner: 'Ti', note: 'SLACK_WEBHOOK_URL' },
      { id: 'P0-06', title: 'Mystery shopper + Confirm → PDF u inboxu', status: 'TI', owner: 'Ti' },
      { id: 'P0-07', title: 'Legal counsel sign-off', status: 'TI', owner: 'Ti' },
    ],
  },
  {
    id: 'p1',
    title: 'P1 — Deploy queue',
    subtitle: 'Kod spreman — commit · deploy · migracija',
    items: [
      { id: 'P1-01', title: 'Paketi × industrije (package-industry-problems)', status: 'READY', owner: 'Agent' },
      { id: 'P1-02', title: 'Maintenance tier-i + Stripe checkout', status: 'READY', owner: 'Agent' },
      { id: 'P1-03', title: 'BFF package-context + DeliverableQuotePanel', status: 'READY', owner: 'Agent' },
      { id: 'P1-04', title: 'InvoiceHistoryPanel + BFF /billing/invoices', status: 'READY', owner: 'Agent' },
      { id: 'P1-05', title: 'Problem Hunter modul (API MVP)', status: 'READY', owner: 'Agent' },
      { id: 'P1-06', title: 'Migracija 037_problem_hunter.sql na prod', status: 'BLOCKED', owner: 'Agent+Ti', note: 'Posle deploy' },
      { id: 'P1-07', title: 'Git commit + push P1 izmena', status: 'READY', owner: 'Agent' },
      { id: 'P1-08', title: 'Deploy na prod (SafeDeploy)', status: 'BLOCKED', owner: 'Agent', note: 'Posle commit' },
    ],
  },
  {
    id: 'p2',
    title: 'P2 — NA KRAJU',
    subtitle: 'Posle P0 + P1 — firma i live plaćanja',
    items: [
      { id: 'P2-01', title: 'LLC / firma (legal polja)', status: 'DEFERRED', owner: 'Ti' },
      { id: 'P2-02', title: 'Stripe LIVE + kartica smoke', status: 'DEFERRED', owner: 'Ti' },
      { id: 'P2-03', title: 'PayPal API', status: 'DEFERRED', owner: 'Ti' },
      { id: 'P2-04', title: 'Wise API', status: 'DEFERRED', owner: 'Ti' },
      { id: 'P2-05', title: 'Kriptoman API', status: 'DEFERRED', owner: 'Ti' },
      { id: 'P2-06', title: 'FINANCE_URL aggregator', status: 'N/A', note: 'Namerno prazan' },
    ],
  },
  {
    id: 'p3-outbound',
    title: 'P3 — Outbound / enrich',
    subtitle: 'Opciono',
    items: [
      { id: 'P3-A01', title: 'LUSHA_API_KEY', status: 'DEFERRED' },
      { id: 'P3-A02', title: 'TAVILY_API_KEY', status: 'DEFERRED' },
      { id: 'P3-A03', title: 'ZOOMINFO_API_KEY', status: 'DEFERRED' },
      { id: 'P3-A04', title: 'Cold outbound send ON', status: 'BLOCKED', note: 'Posle P0-01, P0-03' },
      { id: 'P3-A05', title: 'Live n8n workflow', status: 'DEFERRED' },
      { id: 'P3-A06', title: 'Ads €200–300', status: 'DEFERRED' },
    ],
  },
  {
    id: 'p3-infra',
    title: 'P3 — Infra / ops',
    items: [
      { id: 'P3-D01', title: 'Staging VPS', status: 'DEFERRED' },
      { id: 'P3-D02', title: 'UptimeRobot', status: 'DEFERRED' },
      { id: 'P3-D03', title: 'Plausible analytics', status: 'DEFERRED' },
      { id: 'P3-D04', title: 'GitHub CI required checks', status: 'DEFERRED' },
      { id: 'P3-D05', title: 'DMARC p=quarantine', status: 'DEFERRED' },
      { id: 'P3-D06', title: 'Nest TypeORM prod', status: 'N/A' },
    ],
  },
  {
    id: 'p3-product',
    title: 'P3 — Product backlog',
    items: [
      { id: 'P3-E01', title: 'Problem Hunter dedup (Faza 7)', status: 'PARTIAL' },
      { id: 'P3-E02', title: 'F4-6 AI / email / upload', status: 'DEFERRED' },
      { id: 'P3-E03', title: 'Faza 6 K8s epic', status: 'DEFERRED' },
      { id: 'P3-G01', title: 'Redizajn UI', status: 'CANCELLED' },
    ],
  },
];

export const EMPTY_KEYS_PRIORITY = [
  'CONTACT_SLACK_WEBHOOK_URL',
  'SLACK_WEBHOOK_URL',
  'LUSHA_API_KEY',
  'TAVILY_API_KEY',
  'PAYPAL_CLIENT_ID',
  'WISE_API_KEY',
  'KRIPTOMAN_API_KEY',
];

export function countByStatus(sections: KanonSection[]) {
  const all = sections.flatMap((s) => s.items);
  const open = all.filter((i) => i.status === 'TI' || i.status === 'READY' || i.status === 'BLOCKED');
  const done = all.filter((i) => i.status === 'DONE');
  const p0Open = sections.find((s) => s.id === 'p0')?.items.filter((i) => i.status === 'TI').length ?? 0;
  const p1Open = sections.find((s) => s.id === 'p1')?.items.filter((i) => ['READY', 'BLOCKED'].includes(i.status)).length ?? 0;
  return { total: all.length, open: open.length, done: done.length, p0Open, p1Open };
}

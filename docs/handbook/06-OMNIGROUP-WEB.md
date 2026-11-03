# 06 — Omnigroup web (`apps/omnigroup-web`)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`05-ATINA-SYSTEM-NEST.md`](./05-ATINA-SYSTEM-NEST.md) · Sledeće: [`07-ALATI-YOUTUBE-NAPLATA.md`](./07-ALATI-YOUTUBE-NAPLATA.md)

Next.js 14 (App Router) aplikacija koja je istovremeno **javni marketinški sajt** i **klijentski/admin dashboard**. Nema sopstvenu bazu: sve podatke dobija od Express Atine kroz BFF rute (`src/app/api/atina/*`), a sesiju drži u potpisanom kolačiću.

## Tehnologija i pokretanje

`next@14.2`, `react@18`, Tailwind `3.4`, `framer-motion`, `lucide-react`, TypeScript.

```bash
cd apps/omnigroup-web
npm ci
cp .env.example .env.local     # NEXT_PUBLIC_ATINA_API_BASE=http://127.0.0.1:3000
npm run dev                    # http://127.0.0.1:3010
npm run build && npm start     # produkcija; Docker mapira WEB_PORT (3010) → 3000
```

U Cloud Agent okruženju dev server se pokreće u tmux sesiji `omnigroup-web` sa `--hostname 0.0.0.0` (vidi [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md)). **Ne pokretati `next build` dok dev server radi** — dele `.next` folder.

## Stranice

| Ruta | Uloga | Fajl |
|------|-------|------|
| `/` | Početna: „Custom software and automation built for your business” | `src/app/(marketing)/page.tsx` |
| `/pricing` | Živa ponuda 25 isporuka; izbor tier-a, industrije, provajdera plaćanja, intenziteta tržišta i **regiona** (Balkan/EU/DACH/Global) | `src/app/(marketing)/pricing/page.tsx` |
| `/services` | Katalog usluga po kategorijama (AI automation, implementation, consulting, support, growth) — cene izvedene iz kataloga isporuka | `src/app/(marketing)/services/page.tsx`, `src/lib/marketing-catalog.ts` |
| `/products` | Moduli platforme i planovi | `src/app/(marketing)/products/page.tsx`, `src/lib/marketing-plans.ts` |
| `/solutions`, `/solutions/[slug]` | Vertikalne landing stranice (iz `generated-verticals-index.json` + Atina `public-site`) | `src/app/(marketing)/solutions/` |
| `/sites/[slug]` | Javni sajtovi klijenata (isporuke `landing`, `website-*`), uključujući shop narudžbine | `src/app/(marketing)/sites/[slug]/page.tsx` |
| `/contact` | Kontakt forma → e-mail + CRM + Slack | `src/app/(marketing)/contact/page.tsx` |
| `/invoices/preview` | Primeri proforma faktura | `src/app/(marketing)/invoices/preview/page.tsx` |
| `/login` | Prijava (Atina ili demo) | `src/app/login/page.tsx` |
| `/dashboard` (+ `billing/success`, `billing/cancel`, `billing/paypal/success`) | Klijentski portal: isporuke, artefakti, sastanci, avatari | `src/app/dashboard/` |
| `/admin`, `/admin/mobile` | Operaterska konzola: uplate, fulfillment odobrenja, hunting, autonomy, product factory, resursi | `src/app/admin/` |
| `/dev/docs` | Interni hub dokumentacije (`noindex`) — registar putanja svih `.md` fajlova | `src/app/dev/docs/page.tsx` |

Metapodaci: `src/app/robots.ts`, `src/app/sitemap.ts` (`NEXT_PUBLIC_SITE_URL`).

## Sesija i zaštita ruta

- `src/middleware.ts`: matcher `/dashboard/:path*`, `/admin/:path*`; neprijavljen → `/login?next=…`; ne-admin na `/admin*` → `/dashboard`.
- `src/lib/auth-session.ts`: kolačić `og_session` (HttpOnly, potpisan `SESSION_SECRET` / `AUTH_SESSION_SECRET`) nosi Atina access/refresh token i ulogu (`src/lib/auth-roles.ts`).
- `POST /api/auth/login` → Atina `/api/v1/auth/login`; `POST /api/auth/demo` pravi demo sesiju bez Atine; `POST /api/auth/logout` briše kolačić.
- `src/lib/bff-admin-gate.ts` dodatno proverava admin ulogu pre proksiranja admin ruta.

## BFF sloj (`src/app/api/atina/*`)

89 API handlera; `src/lib/atina-bff.ts` prosleđuje zahtev na `resolveAtinaApiBase()` (`ATINA_API_BASE` → `NEXT_PUBLIC_ATINA_API_BASE` → `http://127.0.0.1:3000`, fajl `src/lib/atina-api-base.ts`) sa Bearer tokenom iz sesije. Grupe: `admin/*`, `billing/*` (quotes, fulfillment, revenue), `payments/*` (manual, stripe, paypal, wise, kriptoman), `autonomy-loop/*`, `hunting/*`, `product-factory/*`, `resource-procurement/*`, `video-meetings/*`, `crm/*`, `cursor-agent/*`, `public-site/*`, `workflow-chain/templates`. Kompletna lista u [`08-API-REFERENCA.md`](./08-API-REFERENCA.md).

Ostale API rute: `POST /api/contact`, `GET /api/health` (web + Atina `/health`), `GET /api/public/solutions[/slug]`, `GET /api/public/sites/[slug]`, `POST /api/public/sites/[slug]/shop-order`, `POST|GET /api/upload`.

## Cenovni katalozi na webu (ogledala)

| Fajl | Ogledalo od | Namena |
|------|-------------|--------|
| `src/lib/deliverable-catalog.ts` | Atina `deliverable-catalog.ts` | Instant prikaz na `/pricing` bez round-tripa |
| `src/lib/dynamic-pricing.ts` | Atina `dynamic-pricing.engine.ts` | Ista formula; server i dalje autoritet pri checkout-u |
| `src/lib/market-pricing.ts`, `src/lib/category-pricing.ts` | Atina istoimeni | Regioni, tier-ovi, industrijski indeksi, `BASE_PLAN_PRICES` |
| `src/lib/marketing-catalog.ts` | — | `SERVICE_CATEGORIES` za `/services`; stavke sa `deliverableId` vuku cenu iz kataloga (`serviceFromCatalog`) |
| `src/lib/marketing-plans.ts` | — | `MARKETING_PLANS` + `IMPLEMENTATION_ADDONS` (dodaci izvedeni iz kataloga) |
| `src/lib/deliverable-catalog-ui.ts` | — | Labele kategorija, ikone, redosled na `/pricing` |

Pravilo: kad menjaš anchor cenu ili dodaješ isporuku, menjaj **oba** kataloga i pokreni `npm run build` u web aplikaciji (TypeScript će uhvatiti nepostojeće id-jeve koje `/services` referencira).

## Kontakt forma

`src/app/api/contact/route.ts` → `src/lib/contact-crm-ingress.ts` (Atina `POST /api/v1/crm/contacts` sa `CONTACT_CRM_INGRESS_EMAIL/PASSWORD`; preskače se ako nisu zadati) + Resend (`RESEND_API_KEY`, `CONTACT_EMAIL_*`) + `src/lib/contact-slack-notify.ts` (`CONTACT_SLACK_WEBHOOK_URL`). Bez Resend ključa odgovor je `queued_local_stub`; CRM uspeo a e-mail pao → `crm_ok_email_failed`.

## Env

| Promenljiva | Namena |
|-------------|--------|
| `NEXT_PUBLIC_ATINA_API_BASE` | Atina baza za browser i server (podrazumevano `http://127.0.0.1:3000`) |
| `ATINA_API_BASE` | Server-only override (Docker: `http://atina-api:3000`) |
| `NEXT_PUBLIC_SITE_URL` | Kanonski URL za sitemap/robots |
| `SESSION_SECRET` / `AUTH_SESSION_SECRET` | Potpis kolačića `og_session` |
| `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` | Kontakt e-mail |
| `CONTACT_CRM_INGRESS_EMAIL`, `CONTACT_CRM_INGRESS_PASSWORD` | Tehnički nalog za CRM upis |
| `CONTACT_SLACK_WEBHOOK_URL` | Slack obaveštenje |

## Testovi i provere

| Komanda | Šta |
|---------|-----|
| `npm run build` | **CI gate** (job `omnigroup-web`); hvata TypeScript i rute |
| `npm test` | `scripts/test-atina-normalize.mjs` (normalizacija Atina odgovora) |
| `npm run smoke:integration` | PowerShell smoke web ↔ Atina (`scripts/smoke-web-integration.ps1`) |
| `npm run e2e:billing`, `npm run e2e:register` | E2E ručna uplata / registracija + plan |
| `npm run test:contact` | Kontakt forma protiv Resend-a |
| `npm run smoke:hunting[:quick]` | Hunting stack kroz BFF |

## Dokumentacioni hub `/dev/docs`

`src/app/dev/docs/page.tsx` sadrži `const sections: DocSection[]` sa `paths` nizovima. Lokalni audit `scripts/check-dev-docs-coverage.ps1` zahteva da se svaki `docs/**/*.md` (i root `*.md`, `atina-system/docs/**`, `atina-platform/atina/docs/operations/*.md`) nalazi u nekom `paths` nizu; `check-dev-docs-stale-entries.ps1` proverava obrnuto. Priručnik je registrovan u sekciji „Handbook (priručnik projekta)”.

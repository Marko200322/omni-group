# Omnigroup marketing + dashboard shell (Next.js 14)

Part of **Faza 4** delivery in the monorepo. Futuristic dark UI (Tailwind + Framer Motion).

**Kratak opis (SR):** Next.js u monorepu — zeleni build ovde je job **`omnigroup-web`** u **CI (monorepo)**; pun lokalni mirror celog repoa: [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) i [`scripts/README.md`](../../scripts/README.md).

**CI:** GitHub job **`omnigroup-web`** in [`.github/workflows/ci-monorepo.yml`](../../.github/workflows/ci-monorepo.yml) runs `npm ci` + `npm run build` here. Job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); runs **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md), then `pytest`. Local full mirror: [`scripts/verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); use **`-SkipOmnigroupWeb`** to skip this app; **`-SkipDocAudit`** skips doc gate audit locally only). That mirror also runs Nest **`verify:ci`** — for **`POSTGRES_PORT`** vs host DB see **Port mismatch** in [`scripts/README.md`](../../scripts/README.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2 — [`D1-ITER2-PR-BODY.md`](../../docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 sa D.1 placeholder rekonstrukcijom — [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](../../docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md) · kanonski [`scripts/README.md`](../../scripts/README.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

**Multi-stack HTTP smoke:** [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (Atina Node uključen = **`GET /health`**) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **Dublji Atina gate** (kad Express SaaS radi): `atina-platform/atina` → **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

## Commands

```bash
cd apps/omnigroup-web
npm install
npm run dev    # http://localhost:3010 (Atina API obično na :3000)
npm run build
```

## Lokalni stack (web + Atina API)

**Web (uvek prvo):**

```cmd
cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\apps\omnigroup-web"
copy .env.example .env.local
npm run dev:clean
```

Otvori **http://localhost:3010**. Demo prijava: `/login` → **Klijent demo** / **Admin demo** (bez Atina API-ja).

**Atina API (live podaci + prava prijava):**

1. Uključi **Docker Desktop**.
2. Infra defaulti su u [`config/env-aggregator.json`](../../config/env-aggregator.json) (`DB_*`, `JWT_*`, `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
3. Agregatori (opciono) u `atina-platform/atina/.env` — vidi taj fajl u repou.

```cmd
cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\atina-platform\atina"
npm run db:up
npm run docker:migrate
npm run docker:seed
npm run dev
```

> **Dev + build:** ne pokreći `npm run build` dok `npm run dev` radi na `:3010` — korumpira keš (`Cannot find module './948.js'`). Rešenje: `npm run dev:clean`.

Ili jednom iz root-a:

```powershell
.\scripts\start-local-stack.ps1
```

4. Provera: **http://localhost:3000/health** → JSON OK.
5. U `apps/omnigroup-web/.env.local`: `NEXT_PUBLIC_ATINA_API_BASE=http://127.0.0.1:3000`
6. Restart web dev servera. Na `/login` koristi seed admin nalog iz `env-aggregator.json` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

**Auth BFF:** `POST /api/auth/login` · demo `POST /api/auth/demo` · `POST /api/auth/logout` · cookie `og_session` · middleware štiti `/dashboard` i `/admin`.

**Smoke (web + Atina):** iz repo root-a: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-web-integration.ps1`

**Kontakt (D.2/D.3):** `npm run test:contact` u ovom folderu ili `.\scripts\test-contact-resend.ps1` iz root-a. Bez `RESEND_API_KEY` → stub; sa ključem → pravi email (restart dev posle `.env.local`).

**Disk:** ako `npm ci` padne (**ENOSPC**), iz root-a: `.\scripts\free-disk-space.ps1` (cilj ≥5 GB slobodno na `C:`).

## Staging (vlasnik)

Web env na staging hostu (isti ključevi kao lokalno, druge vrednosti):

| Varijabla | Primer |
|-----------|--------|
| `NEXT_PUBLIC_ATINA_API_BASE` | `https://api.staging.example` |
| `NEXT_PUBLIC_SITE_URL` | `https://staging.example` |
| `SESSION_SECRET` | dug random string (secret store) |
| `RESEND_API_KEY` | Resend staging key |
| `CONTACT_EMAIL_FROM` | verifikovan domen |
| `CONTACT_EMAIL_TO` | tim inbox |

Gate redosled: [`docs/STAGING-MIRROR-PROD.md`](../../docs/STAGING-MIRROR-PROD.md) → [`docs/STAGING-RELEASE-CHECKLIST.md`](../../docs/STAGING-RELEASE-CHECKLIST.md) → `npm run build` u ovom folderu.

## Routes

- `/dev/docs` — lista repo putanja **po sekcijama** + **pretraga** u browseru (**`metadata`** u **`page.tsx`**: naslov **Repo dokovi**, opis (**`#dev-docs-search`** u kartici), **noindex**; **`section-heading-id.ts`** deljen sa klijentom; podaci + **`Suspense`** oko filtera; u **`DevDocsSections.tsx`**: **`nav` preskok** (**`#dev-docs-filter`** → **`#dev-docs-search`** → opciono **`#dev-docs-quick-jump`** → **`#dev-docs-list`**); **`nav` *Brzi skok*** (**`#sec-…`**, lista prati filter + highlight u linkovima); hash skrol + preskok blok poštuju **`prefers-reduced-motion`**; **`role="search"`** (**`#dev-docs-search`**) + **`aria-controls`** (**`#dev-docs-quick-jump`** kad je navigacija u DOM-u, **`#dev-docs-empty`** kad nema pogodaka) + **`aria-describedby`** + **`aria-keyshortcuts`** (Ctrl/⌘+K, **`/`**), **`output`** (broj sekcija/putanja, **`htmlFor`** na filter, **`aria-relevant="text"`**), **`#sec-…`**, **ukupno / prikaz**, filter + **istaknuti pogoci** + panel **nema pogodaka** (`#dev-docs-empty`) + **kopiranje putanje** + **kopiranje punog linka stranice** + **kopiranje hash fragmenta** (`#…` kad postoji) + **kopiranje linka po sekciji** + **Obriši** + **Esc** + **Ctrl/⌘+K** ili **`/`** + **`?q=`** + **`#dev-docs-list`**): ulaz (**akcioni plan CEO, complete system plan, NIVO-3 vizija/status/agent talasi + audit roadmap + plan preostalog + sve-inventory, NIVO-2 agent talasi + CEO PDF closure + CEO D trace, NIVO-3 PDF trace / full audit + CEO F PR body, dry-run log, CEO, NIVO master checkliste, LATEST evidencija Git/TypeORM/G/Vault, VLASNIK, Vault alignment, NIVO-2 discovery, Vault runbook**), F4/dizajn (**backlog, SaaS odluka, F6 backlog, F4-6 spike, API contracts**), CI/Git/gate (**doc gate skripta, NIVO-1 LATEST verify/smoke + verify šablon**), staging/observability, Python/koren (**root `Dockerfile`, compose + override + atina/nest**), Nest (**`Dockerfile`, `package.json`**), Atina SaaS (**E2E, platform `docker-compose` / `Dockerfile` / `.env.example` / `package.json` / `tsconfig`**), **alati** (YouTube pipeline runbook), Next (**konfiguracija, `layout`/`globals`, komponente, javne rute, dashboard/admin, `atina` + `atina-display`, contact + health API, `/dev/docs`, robots/sitemap, `package-lock`**); otvori u editoru / GitHubu
- **`/sitemap.xml`** — iz `app/sitemap.ts`; **`NEXT_PUBLIC_SITE_URL`** za kanonski host u produkciji
- `/robots.txt` — generisan iz `app/robots.ts`
- `/` — landing
- `/services`, `/pricing`, `/contact`
- `/dashboard`, `/admin` — zaštićeno sesijom; javni Atina snapshot + (kad nije demo) autentifikovani pozivi (`notifications/unread-count`). `NEXT_PUBLIC_ATINA_API_BASE` u `.env.local`.

## Contact / email (F4-6)

The `/contact` page posts to **`/api/contact`**. With **no** `RESEND_API_KEY`, the handler returns success with **`queued_local_stub`** (no outbound mail). When **`RESEND_API_KEY`** is set (server-only), the route calls the [Resend](https://resend.com) HTTP API with native `fetch`: **`CONTACT_EMAIL_FROM`** (required for sending) and **`CONTACT_EMAIL_TO`** must also be set; the email subject and body include the submitted name, email, and optional message (capped at 5000 characters). Never commit real API keys; see `.env.example` for variable names. Scope and acceptance: **MVP #2** in [`docs/FAZA-4-F4-6-NEXT.md`](../../docs/FAZA-4-F4-6-NEXT.md).

## Note

`npm run dev` koristi port **3010** da ne kolidira sa Atina API na **3000**. Za produkciju: `next start -p 3010` ili postavi `PORT`.

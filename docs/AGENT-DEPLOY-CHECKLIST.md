# Agent deploy checklist — Omni Group (web + Atina integracija)

**Svrha:** operativna lista za agenta pre sledećih instrukcija vlasnika.  
**Ne uključuje:** CEO/admin checklistu ([`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md)) — Git prod zaštita, live Stripe, rollback ritual, admin monitoring ritual, itd.

**Repo:** `c:\Users\Marko Kosic\OneDrive\Desktop\omni group`  
**Web dev:** `apps/omnigroup-web` → **http://localhost:3010** (`npm run dev` / `npm run dev:clean`)  
**Atina API:** `atina-platform/atina` → podrazumevano **http://localhost:3000**

**Povezano:** [`FAZA-4-F4-6-NEXT.md`](./FAZA-4-F4-6-NEXT.md) · [`DASHBOARD-AUTH-ROADMAP.md`](./DASHBOARD-AUTH-ROADMAP.md) · [`AGENT-HANDOFF-OSTALO.md`](./AGENT-HANDOFF-OSTALO.md) · [`MASTER-FINAL-ROADMAP.md`](./MASTER-FINAL-ROADMAP.md) (P7, P8, P13)

**Legenda:** `[ ]` otvoreno · `[x]` gotovo · **Gate** = mora proći pre označavanja faze kao završene

---

## Već urađeno (ne ponavljati)

- [x] Brend **Omni Group** (Atina · Astra · Titan = moduli) — nav, footer, logo, favicon, copy
- [x] Wordmark u jednom redu: „Omni Group”
- [x] Dugmići i linkovi na marketing stranicama povezani
- [x] Moduli sekcija + footer moduli → dashboard/admin anchor rute
- [x] `npm run lint` + `npm run build` u `apps/omnigroup-web` — PASS
- [x] Dev fix: čist cache (`dev:clean`), stabilan marketing layout (bez `MarketingShell` greške)

---

## Faza A — Stabilnost weba

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| A.1 | [x] Dev server: `npm run dev:clean` → Ready na `:3010` | Terminal bez EADDRINUSE / syntax error |
| A.2 | [x] HTTP smoke: `/`, `/services`, `/pricing`, `/contact`, `/login` → **200** | `Invoke-WebRequest` ili browser |
| A.3 | [x] HTTP smoke: `/dashboard`, `/admin` → **200** (demo bez auth) | Isto |
| A.4 | [x] Statički asseti: `/_next/static/*` ne vraćaju **404** posle restarta | Hard refresh Ctrl+F5 |
| A.5 | [x] Mobilni meni: svi linkovi + „Započni projekat” rade | Ručni pregled |
| A.6 | [x] Sidebar hash navigacija (`#projects`, `#billing`, …) skroluje na sekciju | Dashboard + admin |
| A.7 | [x] Popraviti sitne UI ako padnu u A.1–A.6 (npr. pretraga u PlatformShell — samo UI) | Nema regresije na A.2 |

**Faza A završena kad:** A.1–A.6 su `[x]` i nema belog ekrana / 500 na glavnim rutama.

---

## Faza B — Prava prijava (Atina auth + BFF)

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| B.1 | [x] Proučiti Atina `auth` modul: login, refresh, logout, `/auth/me` | `atina-platform/atina/src/modules/auth/` |
| B.2 | [x] Next BFF ruta(e): npr. `POST /api/auth/login` → Atina `POST /api/v1/auth/login` | Bez JWT u client bundle-u |
| B.3 | [x] HttpOnly session cookie (server-side token map ili encrypted payload) | Dizajn: [`DASHBOARD-AUTH-ROADMAP.md`](./DASHBOARD-AUTH-ROADMAP.md) opcija **1 + 3a** |
| B.4 | [x] `POST /api/auth/logout` + refresh tok po potrebi | Session se briše |
| B.5 | [x] Middleware ili layout guard: `/dashboard`, `/admin` bez sesije → `/login` | Redirect u browseru |
| B.6 | [x] Login forma: „Prijavi se” poziva BFF, ne `preventDefault` demo | Uspeh → dashboard |
| B.7 | [x] Demo dugmad („Klijent demo” / „Admin demo”) ostaju ili se razdvajaju od pravog logina | Jasno u UI copy-ju |
| B.8 | [x] `.env.example` u `omnigroup-web`: `NEXT_PUBLIC_ATINA_API_BASE`, server-only auth varijable | Bez tajni u gitu |

**Faza B završena kad:** ulogovan test korisnik ulazi na `/dashboard` bez ručnog linka; neulogovan ne vidi zaštićene stranice.

---

## Faza C — Live podaci (autentifikovani Atina pozivi)

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| C.1 | [x] `lib/atina.ts` (ili sibling): `fetchAtinaAuthenticated(path, session)` | Bearer iz BFF sesije |
| C.2 | [x] Dashboard: `GET /api/v1/notifications/unread-count` prikazan u UI | Broj se menja posle read/create |
| C.3 | [x] Dashboard/admin: postojeći javni snapshot (`/health`, `/billing/plans`) i dalje rade | `source: live` kad API gore |
| C.4 | [x] Jasne poruke: `unreachable` / `partial` / nema sesije — bez praznog belog panela | StatusPill + copy |
| C.5 | [x] Atina lokalno: Postgres + `npm run` u `atina-platform/atina` — dokumentovati minimalni `.env` | Vlasnik može podići API — vidi `apps/omnigroup-web/README.md` |
| C.6 | [x] Admin „Osveži katalog” (`router.refresh`) i dalje radi sa live podacima | Ručni test |

**Faza C završena kad:** sa podignutim Atina API-jem dashboard pokazuje bar jedan **autentifikovani** i jedan **javni** podatak bez placeholdera za te tokove. ✅ (2026-05-17 — live auth, unread-count, ai-memory BFF)

---

## Faza D — Email i kontakt

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| D.1 | [x] `apps/omnigroup-web/.env.example`: `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` | Samo imena varijabli |
| D.2 | [ ] `POST /api/contact` — kada su env postavljeni, šalje pravi email (Resend) | Test: `.\scripts\test-contact-resend.ps1` ili `npm run test:contact` — **čeka `RESEND_API_KEY`** |
| D.3 | [x] Kada env nisu postavljeni, i dalje `queued_local_stub` (dev friendly) | `POST /api/contact` → 200 `queued_local_stub` |
| D.4 | [x] Kontakt stranica: success/error poruke jasne korisniku | Stub vs Resend copy u UI |
| D.5 | [ ] (Opciono) Atina SMTP staging — pratiti [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) | Odvojeno od Next kontakta |

**Faza D završena kad:** jedan test submit stigne na test inbox **ili** je eksplicitno dokumentovano zašto staging env još nije dostupan (bez lažnog `[x]`).

---

## Faza E — F4-6 ostatak (opciono, posle B–D)

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| E.1 | [x] Mini UI: `ai-memory` — `POST /remember`, `GET /recall` za ulogovanog korisnika | Dashboard `#account` + BFF `/api/atina/ai-memory/*` |
| E.2 | [x] Upload spike: odluka — Atina `forge`/storage kad product traži; Next samo signed URL BFF; limit 10 MB dev | Bez cloud tajni u gitu |
| E.3 | [x] `robots.ts` — finalna pravila (dev rute, sitemap) | `TODO[D.1-restore]` uklonjen |
| E.4 | [x] `dev/layout.tsx` — auth gate za `/dev/docs` ako product traži | Redirect na `/login?next=/dev/docs` |
| E.5 | [x] Ažurirati [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) red F4-6 kad E.1–E.2 prihvatljivi | Doc sync |

**Faza E završena kad:** product prihvati opseg ili eksplicitno odloži stavke — ne blokira deploy A–D.

---

## Faza F — Gate i deploy priprema

| # | Zadatak | Gate / dokaz |
|---|---------|----------------|
| F.1 | [x] Root: `python -m pytest -q` | 11/11 PASS |
| F.2 | [x] `atina-platform/atina`: `npm run test:ci` | 3081 tests PASS |
| F.3 | [x] `atina-system`: `npm run verify:n1` (ili `verify:ci` ako Postgres čist) | 140 tests PASS |
| F.4 | [x] `apps/omnigroup-web`: `npm run lint` + `npm run build` | PASS |
| F.5 | [x] (Opciono pun mirror) [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) — CI job **`python`** / **`Python (Doslednost dok + pytest)`** | **2026-05-17:** `-SkipNestVerifyCi -SkipOmnigroupWeb` → sve gate-ove PASS; web `npm run build` PASS posle clean `npm install`. **`npm ci` ne radi na malom disku (ENOSPC)** — oslobodi ≥5 GB ili koristi `npm install` |
| F.6 | [x] Smoke (kad servisi gore): `smoke-stack.ps1` + `npm run smoke:all` u Atini | Atina `smoke:all` PASS; pun `smoke-stack.ps1` zahteva Astra+Nest |
| F.7 | [x] Uputstvo za vlasnika: push GitHub + CI — [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) | Dokumentovano; izvršava vlasnik |
| F.8 | [x] Staging priprema: [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) + [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) — web env tabela u `apps/omnigroup-web/README.md`; izvršenje §1–§4 na staging hostu čeka vlasnika | Runbook linkovan |

**Faza F završena kad:** F.1–F.4 su `[x]`; F.5–F.8 po dostupnosti okruženja.

---

## Van opsega ove liste (čeka product / vlasnika)

- CEO sekcije A, C, G (Git prod, Nest prod DB, live plaćanja, prod SMTP ritual, rollback sign-off)
- Faza 6 / K8s / pun AI — [`FAZA-6-BACKLOG.md`](./FAZA-6-BACKLOG.md)
- Nest `npm audit` major `@nestjs/*` bump
- Dubinski Nest `supply-core` (worker queue, heartbeat PRO širina)
- Rebrand / logo — **zamrznuto** kako jeste

---

## Redosled izvršavanja

```
A → B → C → D → F → E (opciono)
```

| Faza | Fokus | Bloker za sledeću |
|------|--------|-------------------|
| **A** | Sajt uvek radi lokalno | — |
| **B** | Auth | Potreban za C |
| **C** | Live podaci | Potreban Atina API + B |
| **D** | Email | Nezavisan od B (može paralelno posle A) |
| **F** | Gate / handoff | Pre staging deploya |
| **E** | F4-6 nice-to-have | Ne blokira |

---

## Brze komande (Windows cmd)

```cmd
cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
powershell -ExecutionPolicy Bypass -File .\scripts\pre-push-check.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\stage-agent-work.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\free-disk-space.ps1

cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\apps\omnigroup-web"
npm run dev:clean

cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
python -m pytest -q

cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\atina-platform\atina"
npm run test:ci

cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\atina-system"
npm run verify:n1

cd /d "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\apps\omnigroup-web"
npm run lint
npm run build
```

---

## Status log (agent popunjava po fazama)

| Datum | Faza | Rezultat | Napomena |
|-------|------|----------|----------|
| 2026-05-17 | Pre-A | Web brend + linkovi | Korisnik potvrdio „ostavi tako” |
| 2026-05-17 | A | PASS | HTTP smoke 200; pretraga „uskoro” |
| 2026-05-17 | B | PASS | BFF auth + middleware + demo sesija |
| 2026-05-17 | C | PASS (live) | Docker + Atina :3000; BFF login, ai-memory, unread-count |
| 2026-05-17 | D | delimično | D.3 PASS; `test-contact-resend.ps1`; D.2 čeka Resend ključ |
| 2026-05-17 | E | PASS | ai-memory UI, robots, dev auth gate |
| 2026-05-17 | F | PASS | `free-disk-space.ps1`; verify + smoke |
| 2026-05-17 | Ops | PASS | `owner-smoke-all.ps1`; fix putanja skripti; dev:clean |
| 2026-05-17 | Git | PASS | commit `85c7487` — 87 fajlova; push čeka remote |

---

## Sledeći koraci za vlasnika (posle agenta)

| # | Akcija | Dokaz |
|---|--------|-------|
| 1 | **Resend (D.2):** u `apps/omnigroup-web/.env.local` odkomentariši `RESEND_*`, restart `npm run dev:clean`, pokreni `.\scripts\test-contact-resend.ps1` | `sent_via_resend` + email u inboxu |
| 2 | **Disk:** oslobodi **≥5 GB** na `C:` (OneDrive, Downloads) pre `npm ci` / punog CI mirrora | `freeGB` u PowerShell |
| 3 | **GitHub:** [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) — `pre-push-check.ps1` → commit → `git remote add` + push | Zeleni CI jobovi |
| 4 | **Staging:** deploy na staging host → [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) | Smoke sa staging URL-ovima |

**Agent checklist:** sve faze **A–C, E, F** završene; **D** čeka samo Resend ključ (D.2); **D.5** opciono (Atina SMTP).

---

*Kad vlasnik pošalje dalja uputstva, agent kreće od prve neoznačene faze u ovom fajlu.*

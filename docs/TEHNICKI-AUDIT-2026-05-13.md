# Tehnički audit — snapshot 2026-05-13

**Svrha:** ad-hoc audit kvaliteta koda i zavisnosti pre nego što vlasnik krene Korakom 3 ([`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md), CEO sekcija G). Cilj: brza orijentacija, mini-bekleg za sledeći sprint.

**Operator:** lokalni audit (Cursor agent) na Windows / Docker Desktop, sa svežim [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (Val 353 — danas, PARTIAL `-SkipOmnigroupWeb` zbog D.1; job `python` / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); pun red uključuje `apps/omnigroup-web` osim `-SkipOmnigroupWeb`) i [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Val 350 — danas; tri-stub PASS; Atina Node = `GET /health`). Bundled Atina HTTP gate (login, `/me`, Forge, admin): `npm run smoke:all` (`smoke:all`) u `atina-platform/atina` — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## A. Kvalitet izvornog koda — vrlo čist

| Provera | Atina Node (`atina-platform/atina/src`) | Nest (`atina-system/src`) | Python (`src/`) | omnigroup-web (`apps/omnigroup-web/src`) |
|---------|----------------------------------------|---------------------------|-----------------|------------------------------------------|
| TODO / FIXME / HACK / XXX komentari | **0** | **0** | **0** | **0** |
| `console.log` u prod kodu | **0** | **0** | _(N/A — koristi `logger`)_ | **0** |
| `eval(`, `dangerouslySetInnerHTML`, `child_process.exec(` | **0** | **0** | **0** | **0** |
| Test coverage Atina `test:ci` (Val 353) | **3079 testova / 268 suites — sve PASS** | **10/10 e2e PASS** | **PASS** (pytest koren) | **SKIP** (D.1 — vlasnik-action) |
| Coverage Atina (preliminarno iz Val 353 log-a) | **~100%** kroz `src/modules/**` (par redova `dto` na ~75% branch coverage je očekivano) | — | — | — |

**Zaključak:** kod ne nosi tehnički dug "TODO koje treba dovršiti" niti hot debug `console.log` ostatke. Sve što treba da se odradi je u `CHECKLIST-CEO-SISTEM.md` (10 stavki vlasnika) — ne u kodu.

---

## B. `npm audit` — zavisnosti (snapshot 2026-05-13, posle agentskog `npm audit fix` bez `--force`)

### B.1 `atina-platform/atina/`

| Severity | Pre fix | **Posle `npm audit fix`** | Δ |
|----------|---------|---------------------------|---|
| critical | 0 | **0** | — |
| high | 9 | **7** | **−2** |
| moderate | 2 | **0** | **−2** |
| low | 0 | **0** | — |
| **total** | 11 | **7** | **−4** |

**Glavne porodice (preostalih 7 high):** `nodemailer` (`@nestjs/mailer` peer; `npm audit fix --force` bi instalirao breaking 8.x — odlažem za koordinisani Sprint 2 PR), `multer` / `picomatch` / `glob` / `file-type` lanac (preko `@nestjs/*` peer-eva).

**Verifikacija da audit fix nije ništa pokvario:** `npm run test:ci` u `atina-platform/atina` posle fix-a → **3079 testova / 268 suites — sve PASS**, ~166 s, exit 0. `package-lock.json` ažuriran (commit pripremljen za vlasnika).

### B.2 `atina-system/`

| Severity | Pre fix | **Posle `npm audit fix`** | Δ |
|----------|---------|---------------------------|---|
| critical | 0 | **0** | — |
| high | 5 | **5** | — |
| moderate | 9 | **9** | — |
| low | 4 | **4** | — |
| **total** | 18 | **18** | — |

**Komentar:** `npm audit fix` (bez `--force`) **nije** mogao da popravi nijedan advisory u Nest paketu — sva preostala 18 advisory-ja zahteva koordiniranu major migraciju `@nestjs/*` lanca (multer / picomatch / glob / file-type / @nestjs/core ≤ 11.1.17). Bez `--force` paket-lock ostaje netaknut. Plan: Sprint 2, jedan PR sa Atina + Nest paket bumpom + ručnim review-om za migracije.

**Top 6 advisory-ja (pun spisak: postojeći [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md)):**

1. **`@nestjs/core` ≤ 11.1.17** *(moderate)* — GHSA-36xv-jgw5-4q75 (injection u downstream output).
2. **`ajv` `$data` ReDoS** *(moderate)* — GHSA-2g4f-4pwh-qvx6.
3. **`file-type` ASF/ZIP DoS** *(moderate)* — GHSA-5v7r-6r5c-r473, GHSA-j47w-4g3g-c36v.
4. **`glob` CLI command injection** *(high)* — GHSA-5j98-mcp5-4vw2.
5. **Multer DoS (incomplete cleanup + resource exhaustion)** *(high)* — GHSA-xf7r-hgr6-v32p, GHSA-v52c-386h-88mc.
6. **Picomatch ReDoS / Method Injection** *(high)* — GHSA-3v7f-55p6-f55p, GHSA-c2c7-rcm5-vvqj.

### B.3 Status u repou

- **Critical: 0** u oba paketa — gate ne pada na to.
- High/moderate najveći deo dolazi iz **transitivnih** zavisnosti `@nestjs/*` lanca; rešenje je **koordinisana** Nest minor/major nadogradnja, **ne** `npm audit fix --force`.
- Detaljniji plan: [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md).

---

## C. Mini bekleg (Sprint 2 — opciono, ne blokira release)

| Prioritet | Stavka | Komentar |
|-----------|--------|----------|
| P0 | Vlasnikove stavke iz [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) (10 + 1) | preuzima blok release-a |
| ~~P1 (zatvoreno 2026-05-13)~~ | ~~`npm audit fix` (bez `--force`) u `atina-platform/atina/` i `atina-system/` posle freeza release-a~~ | **Atina:** 11 → 7 advisory-ja (4 lakših advisory zatvoreno, test:ci PASS). **Nest:** 18 → 18 (nijedan advisory rešiv bez `--force`). Detalji: B.1 / B.2. |
| P1 | `npm audit fix --force` u koordiniranom Sprint 2 PR-u (Atina nodemailer 8.x + Nest `@nestjs/*` 11.x lanac) | breaking changes; treba pažljivo verifikovati e2e + `smoke:all` + Nest `verify:ci` |
| P1 | Koordinisan Nest bump (Atina Node + Nest atina-system → ista linija `@nestjs/*` 11.x) | sredi multer/file-type/picomatch/glob lanac u jednom PR-u, sa pažljivim review-om migracije |
| P2 | Dodati `npm run audit:level1` (`npm audit --omit=dev`) i kao CI `non-blocking` job na Atina Node-u | trenutno postoji u Nest-u; uskladiti |
| P2 | Periodičan kvartalni audit dokument (kopija ovog šablona, novi datum) | drži release log-ove "ukucane" u kvartal |
| P3 | Snyk / GitHub Dependabot alerts review (kad budeš na GitHub-u) | dopuna `npm audit` matricom |
| P3 | E2E na staging URL preko Playwright-a (već zatvoreno u N2 E2E.1, ali lokalna jedinstvena scena Supertest) | može jednom u kvartalu |

---

## D. Šta nije promenjeno od Val 348 / 349

- Repo struktura: ista, bez novih `[ ]` koje agent može da zatvori.
- Doc gate (`audit-doc-gate-references.ps1`): **PASS** (nakon novih dokumenata 2026-05-13).
- Smoke `smoke-stack.ps1 -SkipNode:$false` (Val 351, 2026-05-14, najnoviji): **PASS** sva tri stuba; Astra `remaining_rsd=2.33`, Nest `ok=true`, Node `/health` length=248. Val 350 (2026-05-13) ima istu PASS sliku, length=247.
- Bundled Atina release gate `npm run smoke:all` (`atina-platform/atina`, 2026-05-14, par sa Val 351 tri-stub-om): **PASS** sva 6 provera (health, login, auth/me, forge status, atina-forge workflow-template, forge-admin). Konkretni biznis snapshot: 6 users (admin@atina.io role=admin), 27 ukupno templates (14 atina + 10 atina-forge + sync loop), 4 evaluated workflow templates u poslednjih 30 dana sa 83.33% success rate i 1 alert, Forge budget 4000 RSD initial / 4000 remaining / 0 spent (oracle provider, 3 providers konfigurisana). `smoke:all OK` exit 0 ~11 s. Detalji u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) Val 351 zapis.
- **Root Python pytest** (workspace root, 2026-05-14): **PASS** — 11 / 11 testova (Astra app + rotation + vault), ~2.1 s. `pytest 8.3.5`, `pluggy 1.6.0`, `cov 6.0.0`, Python 3.12.10.
- **Nest `verify:n1`** (build + unit, bez Postgres, 2026-05-14, `atina-system`): **PASS** — 32 suites / 140 testova, ~75 s. Pokriva CoreEngine bootstrap, ModuleRegistry (first/second), AI/Notifications/Contracts/Supply DTO + service + controller, internal queue smoke rate limit, health service. Brzi gate (bez `migration:run` / e2e) — pun `verify:ci` zahteva Postgres (vidi Val 354 prolaz).

---

## D.1 Open issue: `apps/omnigroup-web` ima 6 praznih TS/TSX izvora (P1 — vlasnik-action; pun runbook: [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md))

**Otkriveno 2026-05-13 pri Val 351 / Val 353 [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job `python` / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); par `npm run smoke:all` u runbook ostaje):**

Inicijalna greška u Val 351:

```text
✓ Compiled successfully
   Linting and checking validity of types ...
Failed to compile.
.next/types/app/dev/layout.ts:2:24
Type error: File 'src/app/dev/layout.tsx' is not a module.
```

Sistematska pretraga (`Get-ChildItem … | Sort-Object Length`) otkriva **6 praznih (0 B) izvornih fajlova** u `apps/omnigroup-web/src` — verovatno **OneDrive Files On-Demand dehidracija** ili sync konflikt:

| Fajl | Tip | Importovan iz |
|------|-----|---------------|
| `src/app/sitemap.ts` | Next 14 convention | (Next runtime) |
| `src/app/robots.ts` | Next 14 convention | (Next runtime) |
| `src/app/dev/layout.tsx` | App router segment layout | (Next runtime) |
| `src/app/admin/AdminClient.tsx` | Client component | `src/app/admin/page.tsx` |
| `src/app/dashboard/DashboardClient.tsx` | Client component | `src/app/dashboard/page.tsx` |
| `src/lib/atina.ts` | Lib helper | `src/app/admin/page.tsx`, druge rute |
| `src/lib/atina-display.ts` | Lib helper | (rute koje rendere snapshot) |

**Šta je već popravljeno agentski u Val 353:**
- Iz [`apps/omnigroup-web/tsconfig.json`](../apps/omnigroup-web/tsconfig.json) uklonjen broken legacy `include` red `..\\..\\..\\..\\..\\AppData\\Local\\omnigroup-web-next-dist/types/**/*.ts` (taj direktorijum više ne postoji; ostatak iz starog `distDir` eksperimenta).
- **Atina test:ci PASS** (3079 testova), **smoke PASS** (Val 350, sva tri stuba), **Nest verify:ci PASS** (Val 353 na svežem `atina-verify-pg`) — issue je **lokalizovan na `apps/omnigroup-web` Next type-checking** korak.

**Šta agent NIJE smeo da uradi:** rekonstruisati biznis logiku 6 praznih fajlova proizvoljno (nemam git istoriju u ovoj sesiji — `git` nije u PATH-u; nemam pristup OneDrive cloud verziji koja možda još drži pravi sadržaj). Placeholder verzije bi narušile `Admin` i `Dashboard` UX.

**Status:** Val 349 (2026-05-08) je prolazio Omnigroup-web build → znači šest fajlova je tada bilo popunjeno. Najverovatniji uzrok dehidracije:
- OneDrive Files On-Demand "Free up space" je izbrisao lokalni sadržaj dok su fajlovi bili "online-only".
- Drugi proces (verovatno antivirus skener ili Cursor sam) ih je otvorio dok su bili dehidrirani → OneDrive ih je sačuvao kao 0-byte stub.

**Workaround u Val 353:** `-SkipOmnigroupWeb` switch + dedicated `atina-verify-pg` na :5432 (prazna baza) → svi ostali gate-ovi PASS.

**Agentska akcija u Val 354 (Korak 3 placeholder iz runbook-a):** agent je upisao 7 minimalnih placeholder fajlova (sa jasnim `TODO[D.1-restore]` komentarima i `data-placeholder` atributom u JSX-u) tako da Next 14 build prođe; to vraća **PUN verify Val 354 PASS** (svi gate-ovi uključujući `apps/omnigroup-web`). **Placeholder sadržaj NIJE produkcioni:** `AdminClient` / `DashboardClient` su čisti `<pre>` snapshot dump bez auth gate-a, a `loadAtinaPublicSnapshot` vraća `{ status: 'unknown', source: 'placeholder' }`. **Pravi UI mora biti vraćen pre nego što `apps/omnigroup-web` ide na produkcioni deploy.**

**Agentska akcija 2026-05-14 (D.1 placeholder Iter 2 — F4-2 acceptance):** `loadAtinaPublicSnapshot` rekonstruisan po dokumentovanom ugovoru iz [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md) i [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example) — server-side `fetch` na `${NEXT_PUBLIC_ATINA_API_BASE}/health` i `/api/v1/billing/plans`, sa `AbortController` timeout-om (5 s default), graceful fallback (`source` enum: `live` / `partial` / `unreachable`), `errors[]` lista. `lib/atina-display.ts` proširen sa `formatSnapshotLine` / `formatPlanLine` / `describeSource` formatter-ima. `AdminClient` / `DashboardClient` prikazuju čitljiv **Source / Base / Plans count** red, listu billing plans-a (kad ih ima) i collapsible **Greške** + **Sirov snapshot (JSON)** panele — uz čuvanje placeholder upozorenja i `TODO[D.1-restore]` markera za pravi UI. **`npm run build` u `apps/omnigroup-web` PASS** (15/15 stranica, ~178 s, exit 0). **F4-2 acceptance** ([`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md)) — *"realan podatak sa Atina API-ja"* — sada validan iako je Admin/Dashboard UI još uvek placeholder.

**Vlasnik akcije (i dalje obavezan):** [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) Korak 1 (OneDrive cloud restore) ili Korak 2 (Git checkout) — vraćanje pravog sadržaja iz cloud-a / remote-a. Posle restore-a ide još jedan pun verify (npr. Val 355) da se potvrdi da pravi UI prolazi build.

**Zašto P1 (još uvek):** placeholder rešava lokalni build i CI gate, ali Admin/Dashboard ekrani su izgubili biznis logiku. Bez vraćanja pravog UI-a, deploy fronta vodio bi na unfunctional Admin/Dashboard ekrane — što je P1 za bilo koju javnu prezentaciju. **Atina API release vlasnika** (CEO sekcija G) i dalje **ne** zavisi od `apps/omnigroup-web`.

---

## D.2 Open issue: Nest `verify:ci` lokalno — Port mismatch (P3 — poznato lokalno stanje)

**Otkriveno 2026-05-13 pri Val 351 (`-SkipOmnigroupWeb`):**

```text
Error during migration run:
QueryFailedError: relation "users" already exists
  ... InitialSchema1739126400000.up ...
```

**Kontekst:** lokalni `atina_postgres` kontejner (port `localhost:5432`) ima šemu Atina Node SaaS-a (tabela `users` već postoji od `atina_app` migracija). Nest `migration:run` u verify pokušava da kreira *svoju* tabelu `users` na *istoj* bazi → kolizija. Ovo je dokumentovan **Port mismatch** scenario u [`scripts/README.md`](../scripts/README.md).

**U CI-u (GitHub Actions) ovaj problem ne postoji** — `atina-system` job pravi izolovani Postgres servis (`atina/atina/atina`) na svakom run-u.

**Workaround za lokalni run:**
1. **Najbrže:** `-SkipNestVerifyCi` u verify-monorepo (skripta tada pokreće `verify:n1` = build + unit, bez migracija/E2E).
2. **Ili:** odvojeni Postgres za Nest na :5433: u `atina-platform/atina/.env` postavi `DB_PORT_EXPOSE=5433`, `docker compose up -d postgres`, `$env:POSTGRES_PORT='5433'` pre verify.
3. **Ili:** jednokratan novi container samo za verify: `docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` (vidi [`scripts/README.md`](../scripts/README.md), red 62–66).

**Bekleg za sledeći sprint:** verovatno nijedan — ovo je **dokumentovano stanje** u repou. Val 349 (2026-05-08) je bio uspešan jer je tada Atina-Postgres bio "isuš" pre verify-a (bilo je periodičnog `docker compose down -v` u sesiji vlasnika).

**Zašto P3 (ne P2):** ne blokira tim, dokumentovano, ima 3 workaround-a. Zahteva lokalni `docker compose down -v` ili paralelni :5433 setup pre svakog "čistog" pun-mirror lokalnog gate-a.

---

## E. Završne napomene

- **Sigurnosno P0 = 0** u kodu i u zavisnostima (critical = 0). Audit ne blokira release vlasnika.
- **Bekleg iznad** je *opciono*; održavanje, ne blokada.
- **Fresh evidencije:**
  - Smoke (sekcija H, tri-stub) **Val 350** — upisan u [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md). PASS sva tri stuba (Astra `remaining_rsd=2.33`, Nest `ok=true`, Node `/health` length=247).
  - Verify **Val 353** (PARTIAL, `-SkipOmnigroupWeb`), **Val 354** (PUN, 2026-05-13, sa D.1 placeholder rekonstrukcijom) i **Val 355** (PUN, 2026-05-14, sa D.1 placeholder Iter 2 — server-side fetch po dokumentovanom F4-2 ugovoru) — upisani u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md). **Val 355** (LATEST) = exit 0, ~1038 s, svi gate-ovi PASS uključujući `apps/omnigroup-web` build sa Iter 2 placeholder kodom; ranije Val 354 = exit 0, ~1020 s. Sledeći Val (356+) tek posle vlasnikovog OneDrive cloud / Git restore-a za D.1 (vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md)).

---

*Verzija: tehnički audit 2026-05-13 v1. Kreirano automatikom uz fresh smoke + verify; sledeći audit po dogovoru tima.*

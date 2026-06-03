# NIVO-1 — evidencija `verify-monorepo.ps1` (poslednji lokalni prolaz; job **`python`** / [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md))

**Refs:** [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node u tom toku: **`GET /health`**) · Atina **`npm run smoke:all`:** [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08) · [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · [`scripts/README.md`](../scripts/README.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** odeljak **Kad podigneš novi broj** u [`scripts/README.md`](../scripts/README.md).

| Polje | Vrednost |
|--------|----------|
| **Datum** | **2026-06-03** — **PUN** mirror, exit **`0`**, ~1089 s — **`Val 359`** (posle `7c319dd` flaky timeout fix + `732ca14` doc gate; Atina **3257/3257**; Nest **`verify:ci`** na **`atina-verify-pg` :5434**; `atina_postgres` na **:5432** netaknut); **2026-06-02** — **go-live-verify** + **owner-smoke-all** PASS posle push **`7df6ca2`** (manual billing, video-meetings, autonomy-loop, web BFF); Atina **3257/3257** test:ci; Nest **140/140** verify:n1; **Val 358**; **2026-05-21** — **PUN** mirror, exit **`0`**, ~734 s — **`Val 357`** (7 agregatora u `src/integrations/*` + wiring modula; Nest `esModuleInterop` + e2e `supertest` import; Atina **3081/3081** testova); **2026-05-15** — **PUN** mirror **repotvrda**, exit **`0`**, ~646 s — ista putanja gate-ova kao **Val 355** (`$env:POSTGRES_PORT='5434'`, `atina-verify-pg` mapiran **`-p 5434:5432`**; `atina_postgres` na host **:5432** netaknut; operativni primer u [`scripts/README.md`](../scripts/README.md)); **2026-05-14** — **PUN** mirror, exit **`0`**, ~1038 s — **`Val 355`** (svi gate-ovi PASS uključujući **`apps/omnigroup-web build`** — **D.1 placeholder Iter 2** (server-side fetch `/health` + `/api/v1/billing/plans` po dokumentovanom F4-2 ugovoru); Nest `verify:ci` na privremenom **`atina-verify-pg`** kontejneru na **`:5432`**, Atina Node app baza netaknuta — vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md), runbook [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md), audit [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) D.1); **2026-05-13** — **PUN** mirror, exit **`0`**, ~1020 s — **`Val 354`** (svi gate-ovi PASS uključujući **`apps/omnigroup-web build`** — **D.1 placeholder rekonstrukcija** za 7 OneDrive-dehidriranih izvora (sa jasnim `TODO[D.1-restore]` blokovima); Nest `verify:ci` na privremenom **`atina-verify-pg`** kontejneru na **`:5432`**, Atina Node app baza netaknuta — vidi runbook [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md), audit [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) D.1); **2026-05-13** — **PARTIAL** mirror (`-SkipOmnigroupWeb`), exit **`0`**, ~450 s — **`Val 353`** (pre placeholder rekonstrukcije; Nest `verify:ci` PASS na svežem **`atina-verify-pg`** kontejneru); **2026-05-08** — **pun** mirror, exit **`0`**, ~504 s — **`Val 349`** (ponovna potvrda punog CI mirrora posle doc dopuna — smoke/NIVO-1-GATE/RUN-ATINA; podrazumevani **`localhost:5432`**; vidi **Port mismatch** u [`scripts/README.md`](../scripts/README.md)); **Val 346** (~494 s, posle ispravke PowerShell 5.1 u [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)); **Val 345** (~496 s, eksplicitno **`$env:POSTGRES_PORT='5432'`**); **Val 344** (~591 s) — host **5433**; **2026-05-08** ranije — delimični gate `-SkipNestVerifyCi -SkipCompose` / `-SkipDocAudit`; **2026-05-07** — pun mirror **bez** Omnigroup koraka u skripti |
| **Repo root** | `omni group` (Windows) |
| **Komanda (PUN mirror, Val 359 / 2026-06-03 / :5434)** | `docker rm -f atina-verify-pg 2>$null; docker run -d --name atina-verify-pg -p 5434:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` → (čekaj `pg_isready`) → zaustavi web dev na **:3010** → `$env:POSTGRES_PORT='5434'; $env:POSTGRES_HOST='localhost'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PUN mirror, Val 357 / 2026-05-21 / :5434)** | `atina-verify-pg` već na **`:5434`** → `$env:POSTGRES_PORT='5434'; $env:POSTGRES_HOST='localhost'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PUN mirror, Val 356 / 2026-05-16 / :5434)** | `docker rm -f atina-verify-pg 2>$null; docker run -d --name atina-verify-pg -p 5434:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` → (čekaj `pg_isready`) → `$env:POSTGRES_PORT='5434'; $env:POSTGRES_HOST='localhost'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PUN mirror, repotvrda 2026-05-15 / :5434)** | `docker rm -f atina-verify-pg 2>$null; docker run -d --name atina-verify-pg -p 5434:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` → (čekaj `pg_isready`) → `$env:POSTGRES_PORT='5434'; $env:POSTGRES_HOST='localhost'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PUN mirror, Val 355 / 2026-05-14)** | `docker stop atina_postgres; docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` → `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva; uključuje Iter 2 placeholder kod iz [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md))* → `docker rm -f atina-verify-pg; docker start atina_postgres` *(cleanup)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PUN mirror, Val 354 / 2026-05-13)** | `docker stop atina_postgres; docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` → `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva; Omnigroup-web placeholder fajlovi iz [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) Korak 3)* → `docker rm -f atina-verify-pg; docker start atina_postgres` *(cleanup)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (PARTIAL mirror, Val 353 / 2026-05-13)** | `docker stop atina_postgres; docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine` *(privremeni dedicated Postgres; `atina_saas_db` ime istok kao u verify default-u, prazna baza)* → `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb` *(omnigroup preskočen — D.1 u [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md))* → `docker rm -f atina-verify-pg; docker start atina_postgres` *(cleanup)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (pun mirror, Val 349 / 2026-05-08)** | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez skipova; posle ažuriranja dok-a za smoke / monorepo gate)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (pun mirror, Val 346 / 2026-05-08)** | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez skipova; ista sesija posle fix-a `Write-Host` u skripti)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (pun mirror, Val 345 / 2026-05-08)** | `$env:POSTGRES_PORT='5432'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez skipova; Postgres kontejner na host **5432**)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (pun mirror, Val 344 / 2026-05-08)** | `docker compose -f atina-platform/atina/docker-compose.yml` sa **`DB_PORT_EXPOSE=5433`**; zatim `$env:POSTGRES_PORT='5433'; powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez skipova)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (delimični, 2026-05-08)** | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi -SkipCompose` · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **Komanda (istorija, pun mirror, 2026-05-07)** | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1` *(bez switch-eva; skripta tada **nije** uključivala `apps/omnigroup-web`)* · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |

## Postgres (lokalno)

- Servis: `atina-platform/atina` → `docker compose up -d postgres` (čist volumen pre prvog `verify:ci` ako je baza ranije držala Node SaaS šemu — inače TypeORM migracija može javiti „relation already exists“).
- Kredencijali za **verify-monorepo** default: **`atina_user` / `atina_password` / `atina_saas_db`** (isti kao u [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) i u `atina-platform/atina/docker-compose.yml` za Node SaaS Postgres servis; job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)). Compose stack za Nest API (`docker-compose.atina.yml`) koristi zaseban par **`atina` / `atina` / `atina`** za servis **`atina-postgres`** — vidi [`scripts/README.md`](../scripts/README.md).

## Rezultat

### Prolaz 2026-06-03 — **Val 359** — pun mirror (posle `732ca14`)

**Kontekst:** flaky test timeout fix (`7c319dd`), doc gate reference fix, pun CI mirror sa zasebnim Nest Postgresom.

**Postgres:** `atina-verify-pg` na host **`:5434`**; `atina_postgres` (Node SaaS) na **`:5432`** netaknut.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` | PASS |
| pytest (koren) | **11/11** |
| Atina `npm run test:ci` | **3257/3257** |
| `apps/omnigroup-web` `npm ci` + build | PASS |
| Nest `verify:ci` (migracije + e2e) | PASS — **140/140** unit, **10/10** e2e |
| `docker compose config` ×3 | PASS |

**Exit:** **`0`**, ~**1089 s** (~18 min). Web dev zaustavljen pre `npm ci` (izbegnut EPERM na SWC).

### Prolaz 2026-06-02 — **Val 358** — go-live + owner smoke (posle feat `7df6ca2`)

**Kontekst:** manual plaćanja end-to-end, video-meetings BFF, autonomy-loop, invoice numbering fix, Wave 2 Jest coverage, `go-live-verify` web restart posle build.

| Korak | Rezultat |
|--------|----------|
| Atina `npm run test:ci` | PASS — **3257/3257** |
| `go-live-verify.ps1` | PASS — build + smoke + e2e billing |
| Omnigroup web `npm ci` + build | PASS |
| Nest `npm run verify:n1` | PASS — **140/140** |
| `owner-smoke-all.ps1` | PASS — integracija + Resend + `smoke:all` |
| Migracije `011`–`015` | primenjene |
| Agregatori (AI, Nango, Scraper, Comms) | **4/10 OK** — manual mode bez Stripe |

**Napomena:** pun `verify-monorepo.ps1` lokalno zahteva zaustavljen web dev pre `npm ci` (EPERM na SWC). CI na GitHubu nema taj problem.

### Prolaz 2026-05-21 — **Val 357** — pun mirror (Master Blueprint + ecosystem agregatori)

**Kontekst:** nastavak agent checkliste — `deal-offer` (idempotency + COMMS/AI), `validator` (AI na `enrich`), `proxy-rotation` (idempotency + SCRAPER); wave-a PDF docs; doc gate fix u [`AGENT-CHECKLIST-KOMPLET.md`](./AGENT-CHECKLIST-KOMPLET.md) i [`pre-push-check.ps1`](../scripts/pre-push-check.ps1).

**Postgres:** `atina-verify-pg` na host **`:5434`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` | PASS |
| pytest (koren) | PASS — 11 passed |
| Atina `npm run test:ci` | PASS — **3170/3170** testova, **287** suites |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` | PASS — **32/32** unit, **140/140** unit, **10/10** e2e, migracije čisto |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~734 s (~12.2 min); **bez** skip switch-eva.

### Prolaz 2026-05-16 — **Val 356** — pun mirror (7 agregatora + Nest build fix)

**Kontekst:** agent handoff — tanak HTTP klijent po agregatoru (`atina-platform/atina/src/integrations/*`), povezivanje u `ai-memory`, `recommendation`, `integration-hub`, `scraper`, `proxy-rotation`, `backup-recovery`, `notifications`, `forge`, `phase-launch`; unit testovi sa mock axios. Popravka `atina-system/tsconfig.json` (`esModuleInterop: true`) i `test/app.e2e-spec.ts` (`import request from 'supertest'`) da `migration:run` + e2e prolaze na Windows putanji.

**Postgres:** `atina-verify-pg` na host **`:5434`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` | PASS |
| pytest (koren) | PASS — 11 passed |
| Atina `npm run test:ci` | PASS — **3081/3081** testova, **268** suites |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` | PASS — **32/32** unit, **140/140** unit testova, **10/10** e2e, migracije čisto |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~814 s (~13.6 min); **bez** skip switch-eva.

## Rezultat (istorija)

**Napomena (2026-05-08):** pre `pytest` skripta pokreće **`audit-doc-gate-references.ps1`** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); dodatno: referentni paring za `verify-monorepo` / `smoke-stack` (bundled Atina: **`npm run smoke:all`** / **`smoke:all`**); required check ime u Actions: [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) — **`Python (Doslednost dok + pytest)`**); između Atine i Nest-a ide **`apps/omnigroup-web`** (`npm ci` + `npm run build`). Stariji zapisi ispod gde piše „četiri koraka“ = pytest + Atina + Nest + compose, **bez** Omnigroup koraka (i bez doc gate audita u starijim prolazima).

### Prolaz 2026-05-14 — **Val 355** — pun mirror (CI paritet, sve PASS uključujući Omnigroup-web sa D.1 placeholder Iter 2)

**Kontekst:** posle Val 354 punog mirrora i Iter 2 unapređenja D.1 placeholder helper-a (`lib/atina.ts`, `lib/atina-display.ts`, `AdminClient.tsx`, `DashboardClient.tsx` — server-side fetch `/health` + `/api/v1/billing/plans` po dokumentovanom F4-2 ugovoru iz [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md) i [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example)), agent je pokrenuo **pun mirror bez switch-eva** da formalno dokaže da Iter 2 izmene + sav prethodni Val sync (Val 354 verify, Val 351 smoke) ne lome ni jedan gate. Vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md) za predlog commit-a / PR body-ja.

**Postgres za ovaj prolaz:** `atina-verify-pg` (svež `postgres:16-alpine`) na host **`:5432`**, `atina_user` / `atina_password` / `atina_saas_db`. `atina_postgres` (Atina Node) zaustavljen pre prolaza (volumen `omnigroup_atina_pg_data` netaknut), vraćen zdrav posle.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS — 11 passed |
| Atina `npm run test:ci` | PASS — **3079/3079** testova, **268** suites, ~189.7 s |
| Omnigroup web `npm ci` + `npm run build` | **PASS** — 15/15 stranica generisano, exit 0 (Iter 2 placeholder kod sa server-side fetch helperom) |
| Nest `npm run verify:ci` (build + jest unit + migration:run + e2e) | PASS — **32/32 unit suites, 140/140 unit testova, 10/10 e2e**, migracije čisto |
| `docker compose config` ×3 (CI compose job mirror) | PASS |

**Exit code:** `0` — ~1038 s (~17.3 min); **bez** skip switch-eva. Sve PASS na istoj putanji kao Val 354 + Iter 2 placeholder kod (CI paritet potvrđen za Iter 2). **D.1 status:** placeholder Iter 2 + verify PASS lokalno; vlasnik nastavlja Korak 1/2 iz [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) (OneDrive cloud restore ili Git checkout pravog UI-ja) **pre** produkcionog deploy-a `apps/omnigroup-web`. Sledeći Val (356+) ide tek kad se uvedu nove substantive izmene (npr. vraćen pravi UI iz cloud-a / Git remote-a, dependency upgrade, novi modul).

### Prolaz 2026-05-15 — repotvrda punog mirrora (**LATEST verify** i dalje **Val 355**; paralelni Postgres **:5434**)

**Kontekst:** lokalni **`atina_postgres`** zauzeo host **:5432**; repotvrda CI mirrora **bez** `docker stop atina_postgres` — novi **`atina-verify-pg`** na **`-p 5434:5432`**, zatim **`$env:POSTGRES_PORT='5434'`** + **`$env:POSTGRES_HOST='localhost'`** pre `verify-monorepo.ps1` *(bez switch-eva)*. Operativni primer dopisan u [`scripts/README.md`](../scripts/README.md) (blok „Kad je **:5432** zauzet“). Ovo **ne** diže novi Val broj širom dokova — formalni kanon **LATEST verify** ostaje **Val 355** / **2026-05-14** dok vlasnik ne odluči sledeći Val (356+).

**Postgres za ovaj prolaz:** `atina-verify-pg` na host **`:5434`**, ista šema kredencijala kao verify default (`atina_user` / `atina_password` / `atina_saas_db`).

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` | PASS |
| pytest (koren) | PASS — 11 passed |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` | PASS — migracije + **10/10** e2e |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~646 s (~10.8 min); **bez** skip switch-eva.

### Prolaz 2026-05-13 — **Val 354** — pun mirror (CI paritet, sve PASS uključujući Omnigroup-web sa D.1 placeholder rekonstrukcijom)

**Kontekst:** posle Val 353 (PARTIAL, `-SkipOmnigroupWeb`) agent je preuzeo D.1 Korak 3 (placeholder rekonstrukcija) iz [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) — 7 dehidriranih TS/TSX izvora dobilo je minimalne ali tipski tačne implementacije sa jasnim `TODO[D.1-restore]` blokovima:

| Fajl | Placeholder | Vidno označeno |
|------|-------------|---------------|
| `src/app/sitemap.ts` | jedan red — home page sa `NEXT_PUBLIC_SITE_URL` | `// TODO[D.1-restore]: vratiti pun spisak ruta` |
| `src/app/robots.ts` | konzervativna pravila (allow `/`, disallow `/admin`,`/dashboard`,`/dev`) | `// TODO[D.1-restore]: pravila + sitemap-i` |
| `src/app/dev/layout.tsx` | passthrough `<>{children}</>` | `// TODO[D.1-restore]: auth gate / wrap ako je bio` |
| `src/app/admin/AdminClient.tsx` | "Admin (placeholder)" sa `<pre>` snapshot dump | `// TODO[D.1-restore]: pravi AdminClient (auth, panel, akcije)` |
| `src/app/dashboard/DashboardClient.tsx` | "Dashboard (placeholder)" sa `<pre>` snapshot dump | `// TODO[D.1-restore]: pravi DashboardClient (KPI grid)` |
| `src/lib/atina.ts` | `AtinaPublicSnapshot` tip + async `loadAtinaPublicSnapshot()` koji vraća `{ status: 'unknown', source: 'placeholder' }` | `// TODO[D.1-restore]: pravi helper koji čita Atina javni snapshot` |
| `src/lib/atina-display.ts` | `formatSnapshotLine()` (nije importovan iz src/, dovoljan modul marker) | `// TODO[D.1-restore]: pravi formatter helperi` |

Posle placeholder upisa: `Remove-Item -Recurse -Force .next; npm run build` u `apps/omnigroup-web` → **`Compiled successfully`** + 15 ruta generisano (`/`, `/admin`, `/dashboard`, `/contact`, `/services`, `/pricing`, `/api/contact`, `/api/health`, `/dev/docs`, `/robots.txt`, `/sitemap.xml`, itd.). Onda pun verify-monorepo bez switch-eva.

**Postgres za ovaj prolaz:** `atina-verify-pg` (svež `postgres:16-alpine`) na host **`:5432`**, `atina_user` / `atina_password` / `atina_saas_db`. `atina_postgres` (Atina Node) vraćen zdrav posle prolaza.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS — 3079/3079 testova, 268 suites |
| Omnigroup web `npm ci` + `npm run build` | **PASS** — 15 ruta, exit 0 (placeholderi za D.1 — vlasnik vraća pravi UI iz cloud-a / git-a) |
| Nest `npm run verify:ci` (migracije + e2e) | PASS — 10/10 e2e |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~1020 s (~17 min); **bez** skip switch-eva. Sledeći Val (355+) tek kad se uvedu nove substantive izmene; **D.1 status:** placeholder + verify PASS lokalno; vlasnik nastavlja Korak 1/2 iz runbook-a (OneDrive cloud restore ili Git checkout) **pre** produkcionog deploy-a `apps/omnigroup-web`.

**Iter 2 napomena (2026-05-14):** posle Val 354 prolaza, agent je unapredio D.1 placeholder po dokumentovanom F4-2 ugovoru ([`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md), [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example)) — `lib/atina.ts` sada radi server-side `fetch` na `${NEXT_PUBLIC_ATINA_API_BASE}/health` + `/api/v1/billing/plans` sa `AbortController` timeout-om i graceful fallback (`source` enum: `live` / `partial` / `unreachable`); `lib/atina-display.ts` proširen formatter-ima; `AdminClient` / `DashboardClient` prikazuju čitljive **Source / Base / Plans count** panele uz čuvanje `TODO[D.1-restore]` markera. **`npm run build` u `apps/omnigroup-web` PASS** (15/15 stranica, ~178 s, exit 0); doc gate audit PASS. **Bez novog pun-mirror prolaza** — Iter 2 ne menja gate scope (samo unutrašnji sadržaj placeholder fajlova; `verify:ci` rezultati identični Val 354). Pun verify Val 355 ide tek kad vlasnik vrati pravi UI iz Koraka 1/2. Vidi [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) D.1 sekciju i [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) blok "Iter 2 — Placeholder unapređen".

### Prolaz 2026-05-13 — **Val 353** — PARTIAL mirror (`-SkipOmnigroupWeb`; CI paritet u svemu **osim** Omnigroup koraku — D.1)

**Kontekst:** prvi pun pokušaj na **2026-05-13** (Val 351) pao je na dva mesta:

1. **`apps/omnigroup-web` build:** Next.js 14 prijavio `Type error: File 'src/app/dev/layout.tsx' is not a module` jer je fajl bio **0 bajtova** (OneDrive dehidracija ili izgubljen sadržaj). Pretragom je pronađeno **šest** ovakvih fajlova:
   - `src/app/sitemap.ts` · `src/app/robots.ts` (Next 14 conventions)
   - `src/app/admin/AdminClient.tsx` (referenced od `src/app/admin/page.tsx`)
   - `src/app/dashboard/DashboardClient.tsx` (referenced od `src/app/dashboard/page.tsx`)
   - `src/lib/atina.ts` · `src/lib/atina-display.ts` (referenced iz nekoliko ruta)
   
   **Popravljeno (ono što je bezbedno):** uklonjen broken legacy `include` red iz [`apps/omnigroup-web/tsconfig.json`](../apps/omnigroup-web/tsconfig.json) (pokazivao na `..\..\..\..\..\AppData\Local\omnigroup-web-next-dist\types\**\*.ts` koji više ne postoji). **D.1 ostaje vlasnik-action** — rekonstrukcija 6 praznih biznis fajlova nije agent-safe (nemam git istoriju, OneDrive sync može držati pravi sadržaj iz drugog uređaja). Runbook: [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md). Audit: [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) odeljak D.1.

2. **Nest `verify:ci` migracije:** `QueryFailedError: relation "users" already exists` — `atina_postgres` (Atina Node SaaS dev compose) drži `atina_saas_db` šemu kreiranu preko TypeORM **sync**-a; kad `verify-monorepo.ps1` pokreće Nest `migration:run` na **istoj** bazi, prva migracija pada. **Rešenje:** privremeni dedicated **`atina-verify-pg`** kontejner na **`:5432`** sa istim credentialima ali **praznom** bazom (Atina Node `atina_postgres` se zaustavi, posle verify-a vrati). Komanda u tabeli iznad. Atina Node app data nisu dirana (volumen `omnigroup_atina_pg_data` netaknut).

**Postgres za ovaj prolaz:** `atina-verify-pg` (svež `postgres:16-alpine`) na host **`:5432`**, `atina_user` / `atina_password` / `atina_saas_db`. `atina_postgres` (Atina Node) je vraćen zdrav posle prolaza.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | **SKIP** (`-SkipOmnigroupWeb`; D.1 — vlasnik-action) |
| Nest `npm run verify:ci` (migracije + e2e) | PASS — 10/10 e2e |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~450 s; **`-SkipOmnigroupWeb`** jedini switch. Sledeći Val (354 / pun mirror) tek nakon što vlasnik završi D.1 (`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`).

### Prolaz 2026-05-08 — **Val 349** — pun mirror (CI paritet sa [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)))

**Kontekst:** ponovljen pun mirror nakon dopune dok-a (smoke workaround `atina_app`, `NIVO-1-GATE` odjeljak 2b, `RUN-ATINA-PLATFORM.txt`, itd.). **Postgres:** podrazumevani **`5432`**; bez posebnog **`$env:POSTGRES_PORT`**. Kredencijali **`atina_user` / `atina_password` / `atina_db`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` (migracije + e2e) | PASS |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~504 s; **nema** skip switch-eva.

### Prolaz 2026-05-08 — **Val 346** — pun mirror (CI paritet sa [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)))

**Kontekst:** u [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) zamenjen je problematičan `Write-Host "…$(…) — …"` red (PowerShell 5.1 / Unicode) verzijom sa **`-f`** formatom i ASCII crticom, da skripta opet može da se učita i da pouzdano odštampa efektivni **POSTGRES** pre **`verify:ci`**. **Postgres:** host port usklađen sa podrazumevanim **`5432`** u ovom prolazu (nije bilo potrebno ručno **`$env:POSTGRES_PORT`**). Kredencijali **`atina_user` / `atina_password` / `atina_db`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` (migracije + e2e) | PASS |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~494 s; **nema** skip switch-eva.

### Prolaz 2026-05-08 — **Val 345** — pun mirror (CI paritet sa [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)))

**Postgres:** host **`127.0.0.1:5432`** (kontejner mapiran na **5432**). U istom PowerShell prozoru je **`POSTGRES_PORT`** morao biti eksplicitno **`5432`**, jer je vrednost **`5433`** iz ranije sesije ostavila **`migration:run`** da pokuša **ECONNREFUSED** na **5433** dok DB stvarno sluša na **5432** — vidi **Port mismatch** u [`scripts/README.md`](../scripts/README.md). Kredencijali **`atina_user` / `atina_password` / `atina_db`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` (migracije + e2e) | PASS |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — ~496 s; **nema** skip switch-eva.

### Prolaz 2026-05-08 — **Val 344** — pun mirror (CI paritet sa [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)))

**Postgres (Windows workaround):** kontejner `atina_postgres` objavljen na host **`127.0.0.1:5433`** (`DB_PORT_EXPOSE=5433` pri `docker compose up -d postgres`); **`POSTGRES_PORT=5433`** u shell-u pre skripte da Nest TypeORM / `pg` ne puca na **`5432`** (ECONNRESET / connection terminated). Kredencijali i dalje **`atina_user` / `atina_password` / `atina_db`**.

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:ci` (migracije + e2e) | PASS |
| `docker compose config` ×3 | PASS |

**Exit code:** `0` — svi `[done]` redovi u summary-ju skripte; **nema** `-SkipOmnigroupWeb` / `-SkipNestVerifyCi` / `-SkipCompose` / `-SkipDocAudit`.

### Prolaz 2026-05-08 (delimično) — `-SkipNestVerifyCi` + `-SkipCompose`

| Korak | Rezultat |
|--------|----------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS |
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web `npm ci` + `npm run build` | PASS |
| Nest `npm run verify:n1` | PASS |
| Nest `npm run verify:ci` | *preskočeno (switch)* |
| `docker compose config` ×3 | *preskočeno (switch)* |

**Exit code:** `0` — summary: svi izvršeni gate-ovi zeleni; **`verify:ci`** i **compose** namerno nisu deo ovog prolaza (isti razlog kao u dokumentaciji za mašine bez Postgresa/Dockera).

### Prolaz 2026-05-07 — pun mirror **pre** Omnigroup koraka u skripti

| Korak | PASS |
|--------|------|
| pytest (koren) | PASS |
| Atina `npm run test:ci` | PASS |
| Omnigroup web | *nije bio u skripti* |
| Nest `npm run verify:ci` (migracije + e2e) | PASS |
| `docker compose config` ×3 | PASS |

**Exit code (2026-05-07):** `0` — pun mirror tadašnjeg CI reda (četiri izvršena koraka pre dodavanja Next aplikacije u skriptu).

**Potpun paritet sa današnjim pet CI jobova** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + `pytest`; uključujući **`omnigroup-web`**, **`verify:ci`**, **`compose`**): pokreni [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) **bez** switch-eva uz Postgres na host portu koji odgovara **`POSTGRES_PORT`** u tom prozoru i Docker — zapis kao novi Val u istoriji ispod.

## CEO sekcija A / F.4

- **Val 349 (2026-05-08)** = **pun** mirror — ponovna potvrda posle doc dopuna; exit **`0`** ~504 s; svi koraci PASS.
- **Val 346 (2026-05-08)** = **pun** mirror posle ispravke [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) (PowerShell 5.1); exit **`0`** ~494 s; svi koraci PASS.
- **Val 345 (2026-05-08)** = **pun** mirror istog workflow-a; **`POSTGRES_PORT`** usklađen sa stvarnim host portom (**5432** u ovom prolazu; vidi **Port mismatch** u [`scripts/README.md`](../scripts/README.md)).
- **Val 344 (2026-05-08)** = **pun** lokalni mirror **današnjeg** **`.github/workflows/ci-monorepo.yml`** (pet **jobova** na GitHubu; job **`python`** u UI branch protection obično **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); u skripti prvo **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); zatim pytest i ostalo), uz Windows napomenu za **`POSTGRES_PORT`** / **`DB_PORT_EXPOSE`** kada `pg` ne radi na **`5432`**.
- **Delimični 2026-05-08** (`-SkipNestVerifyCi -SkipCompose`) dokazuje **prednji deo** + **Omnigroup** + Nest **`verify:n1`**; **nije** zamena za **`verify:ci`** + **compose** na mašini bez alata.
- **2026-05-07** prolaz je bio **pun** mirror **tadašnjeg** četvorokoračnog skriptnog reda (pre Omnigroup koraka).
- GitHub i dalje koristi drugačije ime Postgres servisa na runneru — izolovana prazna baza po job-u.
- Šablon za sledeće prolaze: [`NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md).

## Istorija

**Uvod:** `-SkipNestVerifyCi` / `-SkipCompose` su dokumentovani **delimični** lokalni gate (bez Postgresa / bez Docker-a). **Val 349** / **Val 346** / **Val 345** / **Val 344** = **pun** mirror sa svim koracima (**2026-05-08**; različit kontekst env-a / ispravka skripte / doc dopune). Sekcija **„delimično 2026-05-08“** iznad = poslednji zapis tog tipa **sa** **`apps/omnigroup-web`**. **„Prolaz 2026-05-07“** = poslednji **pun** mirror **bez** Omnigroup koraka u skripti (četiri izvršena koraka + exit `0`).

**Val 349 (2026-05-08):** pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) bez skipova; posle doc dopuna (smoke / gate runbook); **exit `0`** (~504 s); svi koraci kao u tabeli **Val 349** iznad PASS.

**Val 346 (2026-05-08):** pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) bez skipova; posle fix-a `Write-Host` (POSTGRES red) u skripti; **exit `0`** (~494 s); svi koraci kao u tabeli **Val 346** iznad PASS.

**Val 345 (2026-05-08):** pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) bez skipova; Postgres na hostu **5432**; **`$env:POSTGRES_PORT='5432'`** (isključuje konflikt sa starijim **`5433`** u env-u); **exit `0`** (~496 s); svi koraci kao u tabeli **Val 345** iznad PASS.

**Val 344 (2026-05-08):** pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) bez skipova; Postgres na hostu **5433** (`DB_PORT_EXPOSE=5433`, `POSTGRES_PORT=5433`); **exit `0`** (~591 s); svi koraci iz tabele **Val 344** iznad PASS (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + … + `migration:run` + e2e + tri `docker compose config`).

**Potvrda posle Val 11 (isti dan):** ponovo pokrenut pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) (bez skipova) posle izmena na Nest compose-u (host **:3001**, `CORS_ORIGINS`, duži `JWT_SECRET`), `docker-compose.nest-port-3001.yml` (merge bez duplog `ports`), i `atina-platform/atina` compose + Dockerfile — **exit `0`**, svi četiri koraka PASS *(četiri = pytest + Atina + Nest + compose; pre dodavanja Omnigroup koraka u skriptu, 2026-05-08)*.

**Posle Val 14 (**CEO sekcija B** — deljeni vault + lokalni `docker-compose.override`):** još jedan pun prolaz — **exit `0`** (pytest, `test:ci`, `verify:ci`, ×3 compose `config`). *Napomena:* [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) ne učitava lokalni root `docker-compose.override.yml` (samo eksplicitni `-f` fajlovi kao u CI).

**Val 18:** ponovljen pun prolaz posle ažuriranja [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) (linkovi ka matrici / **CEO sekcijama A–H**) — **exit `0`**.

**Val 21 (2026-04-17):** ponovljen pun prolaz posle završetka Val 20 (portabilnost dok-a) — **exit `0`** (pytest, `test:ci`, `verify:ci`, ×3 compose `config`).

**Val 24 (2026-04-17):** još jedan pun prolaz (nastavak sesije) — **exit `0`** (isti četiri koraka PASS — isto kao gore, pre Omnigroup koraka); zapis i u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 26 (2026-04-17):** pun prolaz posle Val 25 (`atina-system` e2e — `stopCronJobs` pre `close`) — **exit `0`**; u izlazu nema scheduler **QueryFailedError** šuma tokom e2e; zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 29 (2026-04-17):** pun prolaz posle Val 28 (`CONTRIBUTING.md`, `CEO-OPEN-BULLETS-RUNBOOK.md` — bez izmene aplikacionog koda) — **exit `0`** (~223 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 31 (2026-04-17):** pun prolaz posle Val 30 (smoke tri stuba + doc ažuriranja) — **exit `0`** (~216 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 33 (2026-04-17):** pun prolaz posle Val 32 (smoke) — **exit `0`** (~250 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 35 (2026-04-17):** pun prolaz posle Val 34 (smoke) — **exit `0`** (~222 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 37 (2026-04-17):** pun prolaz posle Val 36 (smoke) — **exit `0`** (~220 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 39 (2026-04-17):** pun prolaz posle Val 38 (smoke) — **exit `0`** (~218 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 41 (2026-04-17):** pun prolaz posle Val 40 (smoke) — **exit `0`** (~235 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 43 (2026-04-17):** pun prolaz posle Val 42 (smoke) — **exit `0`** (~226 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 45 (2026-04-17):** pun prolaz posle Val 44 (smoke) — **exit `0`** (~232 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 47 (2026-04-17):** pun prolaz posle Val 46 (smoke) — **exit `0`** (~242 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 49 (2026-04-17):** pun prolaz posle Val 48 (smoke) — **exit `0`** (~262 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 51 (2026-04-17):** pun prolaz posle Val 50 (smoke) — **exit `0`** (~229 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 53 (2026-04-17):** pun prolaz posle Val 52 (smoke) — **exit `0`** (~224 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 55 (2026-04-17):** pun prolaz posle Val 54 (smoke) — **exit `0`** (~258 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 57 (2026-04-17):** pun prolaz posle Val 56 (smoke) — **exit `0`** (~247 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 59 (2026-04-17):** pun prolaz posle Val 58 (smoke) — **exit `0`** (~252 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 61 (2026-04-17):** pun prolaz posle Val 60 (smoke) — **exit `0`** (~265 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 63 (2026-04-17):** pun prolaz posle Val 62 (smoke) — **exit `0`** (~249 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 65 (2026-04-17):** pun prolaz posle Val 64 (smoke) — **exit `0`** (~282 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 67 (2026-04-17):** pun prolaz posle Val 66 (smoke) — **exit `0`** (~266 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 69 (2026-04-17):** pun prolaz posle Val 68 (smoke) — **exit `0`** (~246 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 71 (2026-04-17):** pun prolaz posle Val 70 (smoke) — **exit `0`** (~248 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 73 (2026-04-17):** pun prolaz posle Val 72 (smoke) — **exit `0`** (~263 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 75 (2026-04-17):** pun prolaz posle Val 74 (smoke) — **exit `0`** (~249 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 77 (2026-04-17):** pun prolaz posle Val 76 (smoke) — **exit `0`** (~254 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 79 (2026-04-17):** pun prolaz posle Val 78 (smoke) — **exit `0`** (~272 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 81 (2026-04-17):** pun prolaz posle Val 80 (smoke) — **exit `0`** (~250 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 83 (2026-04-17):** pun prolaz posle Val 82 (smoke) — **exit `0`** (~270 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 85 (2026-04-17):** pun prolaz posle Val 84 (smoke) — **exit `0`** (~255 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 87 (2026-04-17):** pun prolaz posle Val 86 (smoke) — **exit `0`** (~242 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 89 (2026-04-17):** pun prolaz posle Val 88 (smoke) — **exit `0`** (~246 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 91 (2026-04-17):** pun prolaz posle Val 90 (smoke) — **exit `0`** (~263 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 93 (2026-04-17):** pun prolaz posle Val 92 (smoke) — **exit `0`** (~246 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 95 (2026-04-17):** pun prolaz posle Val 94 (smoke) — **exit `0`** (~275 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 97 (2026-04-17):** pun prolaz posle Val 96 (smoke) — **exit `0`** (~271 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 99 (2026-04-17):** pun prolaz posle Val 98 (smoke) — **exit `0`** (~260 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 101 (2026-04-17):** pun prolaz posle Val 100 (smoke) — **exit `0`** (~279 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 103 (2026-04-17):** pun prolaz posle Val 102 (smoke) — **exit `0`** (~274 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 105 (2026-05-06):** pun prolaz posle Val 104 (smoke) — **exit `0`** (~597 s); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 107 (2026-05-06):** pun prolaz posle Val 106 (smoke) — **exit `0`** (~227 s, `WALL_MS` ≈ 227212); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 109 (2026-05-06):** pun prolaz posle Val 108 (smoke) — **exit `0`** (~216 s, `WALL_MS` ≈ 216216); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 111 (2026-05-06):** pun prolaz posle Val 110 (smoke) — **exit `0`** (~205 s, `WALL_MS` ≈ 205387); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 113 (2026-05-06):** pun prolaz posle Val 112 (smoke) — **exit `0`** (~204 s, `WALL_MS` ≈ 204516); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 115 (2026-05-06):** pun prolaz posle Val 114 (smoke) — **exit `0`** (~232 s, `WALL_MS` ≈ 232408); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 117 (2026-05-06):** pun prolaz posle Val 116 (smoke) — **exit `0`** (~215 s, `WALL_MS` ≈ 214811); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 119 (2026-05-06):** pun prolaz posle Val 118 (smoke) — **exit `0`** (~211 s, `WALL_MS` ≈ 211194); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 121 (2026-05-06):** pun prolaz posle Val 120 (smoke) — **exit `0`** (~229 s, spoljni `OUTER_WALL_MS` ≈ 229096); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 123 (2026-05-06):** pun prolaz posle Val 122 (smoke) — **exit `0`** (~212 s, spoljni `OUTER_WALL_MS` ≈ 211739); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 125 (2026-05-06):** pun prolaz posle Val 124 (smoke) — **exit `0`** (~221 s, spoljni `OUTER_WALL_MS` ≈ 221406); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 127 (2026-05-06):** pun prolaz posle Val 126 (smoke) — **exit `0`** (~221 s, spoljni `OUTER_WALL_MS` ≈ 221174); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 129 (2026-05-06):** pun prolaz posle Val 128 (smoke) — **exit `0`** (~213 s, spoljni `OUTER_WALL_MS` ≈ 212755); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 131 (2026-05-06):** pun prolaz posle Val 130 (smoke) — **exit `0`** (~232 s, spoljni `OUTER_WALL_MS` ≈ 232373); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 133 (2026-05-06):** pun prolaz posle Val 132 (smoke) — **exit `0`** (~245 s, spoljni `OUTER_WALL_MS` ≈ 244853); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 135 (2026-05-06):** pun prolaz posle Val 134 (smoke) — **exit `0`** (~221 s, spoljni `OUTER_WALL_MS` ≈ 221064); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 137 (2026-05-06):** pun prolaz posle Val 136 (smoke) — **exit `0`** (~238 s, spoljni `OUTER_WALL_MS` ≈ 237654); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 139 (2026-05-06):** pun prolaz posle Val 138 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` ≈ 229542); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 141 (2026-05-06):** pun prolaz posle Val 140 (smoke) — **exit `0`** (~224 s, spoljni `OUTER_WALL_MS` ≈ 224372); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 143 (2026-05-06):** pun prolaz posle Val 142 (smoke) — **exit `0`** (~235 s, spoljni `OUTER_WALL_MS` ≈ 234698); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 145 (2026-05-06):** pun prolaz posle Val 144 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` ≈ 231476); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 147 (2026-05-06):** pun prolaz posle Val 146 (smoke) — **exit `0`** (~233 s, spoljni `OUTER_WALL_MS` ≈ 232947); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 149 (2026-05-06):** pun prolaz posle Val 148 (smoke) — **exit `0`** (~239 s, spoljni `OUTER_WALL_MS` ≈ 238901); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 151 (2026-05-06):** pun prolaz posle Val 150 (smoke) — **exit `0`** (~241 s, spoljni `OUTER_WALL_MS` ≈ 240866); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 153 (2026-05-06):** pun prolaz posle Val 152 (smoke) — **exit `0`** (~226 s, spoljni `OUTER_WALL_MS` ≈ 226330); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 155 (2026-05-06):** pun prolaz posle Val 154 (smoke) — **exit `0`** (~235 s, spoljni `OUTER_WALL_MS` ≈ 234577); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 157 (2026-05-06):** pun prolaz posle Val 156 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` ≈ 230885); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 159 (2026-05-06):** pun prolaz posle Val 158 (smoke) — **exit `0`** (~243 s, spoljni `OUTER_WALL_MS` ≈ 243322); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 161 (2026-05-06):** pun prolaz posle Val 160 (smoke) — **exit `0`** (~248 s, spoljni `OUTER_WALL_MS` ≈ 247841); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 163 (2026-05-06):** pun prolaz posle Val 162 (smoke) — **exit `0`** (~237 s, spoljni `OUTER_WALL_MS` ≈ 237339); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 165 (2026-05-06):** pun prolaz posle Val 164 (smoke) — **exit `0`** (~251 s, spoljni `OUTER_WALL_MS` ≈ 250739); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 167 (2026-05-06):** pun prolaz posle Val 166 (smoke) — **exit `0`** (~232 s, spoljni `OUTER_WALL_MS` ≈ 231867); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 169 (2026-05-06):** pun prolaz posle Val 168 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` ≈ 231012); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 171 (2026-05-06):** pun prolaz posle Val 170 (smoke) — **exit `0`** (~248 s, spoljni `OUTER_WALL_MS` ≈ 248219); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 173 (2026-05-06):** pun prolaz posle Val 172 (smoke) — **exit `0`** (~234 s, spoljni `OUTER_WALL_MS` ≈ 234318); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 175 (2026-05-06):** pun prolaz posle Val 174 (smoke) — **exit `0`** (~229 s, spoljni `OUTER_WALL_MS` ≈ 228703); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 177 (2026-05-06):** pun prolaz posle Val 176 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` ≈ 229754); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 179 (2026-05-06):** pun prolaz posle Val 178 (smoke) — **exit `0`** (~212 s, spoljni `OUTER_WALL_MS` ≈ 212205); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 181 (2026-05-06):** pun prolaz posle Val 180 (smoke) — **exit `0`** (~219 s, spoljni `OUTER_WALL_MS` ≈ 218859); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 183 (2026-05-06):** pun prolaz posle Val 182 (smoke) — **exit `0`** (~220 s, spoljni `OUTER_WALL_MS` ≈ 220083); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 185 (2026-05-06):** pun prolaz posle Val 184 (smoke) — **exit `0`** (~228 s, spoljni `OUTER_WALL_MS` ≈ 228450); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 187 (2026-05-06):** pun prolaz posle Val 186 (smoke) — **exit `0`** (~218 s, spoljni `OUTER_WALL_MS` ≈ 217715); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 189 (2026-05-06):** pun prolaz posle Val 188 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` ≈ 230330); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 191 (2026-05-06):** pun prolaz posle Val 190 (smoke) — **exit `0`** (~239 s, spoljni `OUTER_WALL_MS` ≈ 238980); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 193 (2026-05-06):** pun prolaz posle Val 192 (smoke) — **exit `0`** (~238 s, spoljni `OUTER_WALL_MS` ≈ 237917); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 195 (2026-05-06):** pun prolaz posle Val 194 (smoke) — **exit `0`** (~222 s, spoljni `OUTER_WALL_MS` ≈ 221504); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 197 (2026-05-06):** pun prolaz posle Val 196 (smoke) — **exit `0`** (~242 s, spoljni `OUTER_WALL_MS` ≈ 242348); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 199 (2026-05-06):** pun prolaz posle Val 198 (smoke) — **exit `0`** (~234 s, spoljni `OUTER_WALL_MS` ≈ 234253); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 201 (2026-05-06):** pun prolaz posle Val 200 (smoke) — **exit `0`** (~242 s, spoljni `OUTER_WALL_MS` ≈ 241595); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 203 (2026-05-06):** pun prolaz posle Val 202 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` ≈ 231463); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 205 (2026-05-06):** pun prolaz posle Val 204 (smoke) — **exit `0`** (~347 s, spoljni `OUTER_WALL_MS` ≈ 347456); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 207 (2026-05-06):** pun prolaz posle Val 206 (smoke) — **exit `0`** (~537 s, spoljni `OUTER_WALL_MS` = **537406**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 209 (2026-05-06):** pun prolaz posle Val 208 (smoke) — **exit `0`** (~235 s, spoljni `OUTER_WALL_MS` = **235167**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 211 (2026-05-06):** pun prolaz posle Val 210 (smoke) — **exit `0`** (~225 s, spoljni `OUTER_WALL_MS` = **225195**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 213 (2026-05-06):** pun prolaz posle Val 212 (smoke) — **exit `0`** (~238 s, spoljni `OUTER_WALL_MS` = **237679**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 215 (2026-05-06):** pun prolaz posle Val 214 (smoke) — **exit `0`** (~243 s, spoljni `OUTER_WALL_MS` = **243048**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 217 (2026-05-06):** pun prolaz posle Val 216 (smoke) — **exit `0`** (~237 s, spoljni `OUTER_WALL_MS` = **236905**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 219 (2026-05-06):** pun prolaz posle Val 218 (smoke) — **exit `0`** (~250 s, spoljni `OUTER_WALL_MS` = **250438**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 221 (2026-05-06):** pun prolaz posle Val 220 (smoke) — **exit `0`** (~267 s, spoljni `OUTER_WALL_MS` = **266580**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 223 (2026-05-06):** pun prolaz posle Val 222 (smoke) — **exit `0`** (~261 s, spoljni `OUTER_WALL_MS` = **261374**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 225 (2026-05-06):** pun prolaz posle Val 224 (smoke) — **exit `0`** (~235 s, spoljni `OUTER_WALL_MS` = **235333**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 227 (2026-05-06):** pun prolaz posle Val 226 (smoke) — **exit `0`** (~251 s, spoljni `OUTER_WALL_MS` = **251446**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 229 (2026-05-06):** pun prolaz posle Val 228 (smoke) — **exit `0`** (~249 s, spoljni `OUTER_WALL_MS` = **248552**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 231 (2026-05-07):** pun prolaz posle Val 230 (smoke) — **exit `0`** (~432 s, spoljni `OUTER_WALL_MS` = **431506**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 233 (2026-05-07):** pun prolaz posle Val 232 (smoke) — **exit `0`** (~270 s, spoljni `OUTER_WALL_MS` = **270022**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 235 (2026-05-07):** pun prolaz posle Val 234 (smoke) — **exit `0`** (~606 s, spoljni `OUTER_WALL_MS` = **605634**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 237 (2026-05-07):** pun prolaz posle Val 236 (smoke) — **exit `0`** (~240 s, spoljni `OUTER_WALL_MS` = **239808**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 239 (2026-05-07):** pun prolaz posle Val 238 (smoke) — **exit `0`** (~263 s, spoljni `OUTER_WALL_MS` = **263302**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 241 (2026-05-06):** pun prolaz posle Val 240 (smoke) — **exit `0`** (~229 s, spoljni `OUTER_WALL_MS` = **228757**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 243 (2026-05-06):** pun prolaz posle Val 242 (smoke) — **exit `0`** (~240 s, spoljni `OUTER_WALL_MS` = **239846**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 245 (2026-05-06):** pun prolaz posle Val 244 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` = **229507**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 247 (2026-05-06):** pun prolaz posle Val 246 (smoke) — **exit `0`** (~240 s, spoljni `OUTER_WALL_MS` = **239577**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 249 (2026-05-06):** pun prolaz posle Val 248 (smoke) — **exit `0`** (~275 s, spoljni `OUTER_WALL_MS` = **275236**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 251 (2026-05-06):** pun prolaz posle Val 250 (smoke) — **exit `0`** (~249 s, spoljni `OUTER_WALL_MS` = **249051**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 253 (2026-05-06):** pun prolaz posle Val 252 (smoke) — **exit `0`** (~264 s, spoljni `OUTER_WALL_MS` = **264389**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 255 (2026-05-06):** pun prolaz posle Val 254 (smoke) — **exit `0`** (~247 s, spoljni `OUTER_WALL_MS` = **247021**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 257 (2026-05-07):** pun prolaz posle Val 256 (smoke) — **exit `0`** (~577 s, spoljni `OUTER_WALL_MS` = **577220**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 259 (2026-05-07):** pun prolaz posle Val 258 (smoke) — **exit `0`** (~245 s, spoljni `OUTER_WALL_MS` = **244936**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 261 (2026-05-07):** pun prolaz posle Val 260 (smoke) — **exit `0`** (~243 s, spoljni `OUTER_WALL_MS` = **243016**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 263 (2026-05-07):** pun prolaz posle Val 262 (smoke) — **exit `0`** (~232 s, spoljni `OUTER_WALL_MS` = **232060**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 265 (2026-05-07):** pun prolaz posle Val 264 (smoke) — **exit `0`** (~238 s, spoljni `OUTER_WALL_MS` = **237989**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 267 (2026-05-07):** pun prolaz posle Val 266 (smoke) — **exit `0`** (~235 s, spoljni `OUTER_WALL_MS` = **235095**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 269 (2026-05-07):** pun prolaz posle Val 268 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` = **229946**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 271 (2026-05-07):** pun prolaz posle Val 270 (smoke) — **exit `0`** (~234 s, spoljni `OUTER_WALL_MS` = **234341**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 273 (2026-05-07):** pun prolaz posle Val 272 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` = **231045**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 275 (2026-05-07):** pun prolaz posle Val 274 (smoke) — **exit `0`** (~209 s, spoljni `OUTER_WALL_MS` = **209157**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 277 (2026-05-07):** pun prolaz posle Val 276 (smoke) — **exit `0`** (~218 s, spoljni `OUTER_WALL_MS` = **217869**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 279 (2026-05-07):** pun prolaz posle Val 278 (smoke) — **exit `0`** (~210 s, spoljni `OUTER_WALL_MS` = **209650**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 281 (2026-05-07):** pun prolaz posle Val 280 (smoke) — **exit `0`** (~245 s, spoljni `OUTER_WALL_MS` = **245244**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 283 (2026-05-07):** pun prolaz posle Val 282 (smoke) — **exit `0`** (~210 s, spoljni `OUTER_WALL_MS` = **209684**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 285 (2026-05-07):** pun prolaz posle Val 284 (smoke) — **exit `0`** (~210 s, spoljni `OUTER_WALL_MS` = **209598**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 287 (2026-05-07):** pun prolaz posle Val 286 (smoke) — **exit `0`** (~244 s, spoljni `OUTER_WALL_MS` = **243881**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 289 (2026-05-07):** pun prolaz posle Val 288 (smoke) — **exit `0`** (~230 s, spoljni `OUTER_WALL_MS` = **230303**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 291 (2026-05-07):** pun prolaz posle Val 290 (smoke) — **exit `0`** (~226 s, spoljni `OUTER_WALL_MS` = **225869**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 293 (2026-05-07):** pun prolaz posle Val 292 (smoke) — **exit `0`** (~239 s, spoljni `OUTER_WALL_MS` = **238568**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 295 (2026-05-07):** pun prolaz posle Val 294 (smoke) — **exit `0`** (~218 s, spoljni `OUTER_WALL_MS` = **218337**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 297 (2026-05-07):** pun prolaz posle Val 296 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` = **231314**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 299 (2026-05-07):** pun prolaz posle Val 298 (smoke) — **exit `0`** (~242 s, spoljni `OUTER_WALL_MS` = **242013**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 301 (2026-05-07):** pun prolaz posle Val 300 (smoke) — **exit `0`** (~246 s, spoljni `OUTER_WALL_MS` = **245957**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 303 (2026-05-07):** pun prolaz posle Val 302 (smoke) — **exit `0`** (~318 s, spoljni `OUTER_WALL_MS` = **318158**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 305 (2026-05-07):** pun prolaz posle Val 304 (smoke) — **exit `0`** (~241 s, spoljni `OUTER_WALL_MS` = **241179**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 307 (2026-05-07):** pun prolaz posle Val 306 (smoke) — **exit `0`** (~225 s, spoljni `OUTER_WALL_MS` = **224758**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 309 (2026-05-07):** pun prolaz posle Val 308 (smoke) — **exit `0`** (~245 s, spoljni `OUTER_WALL_MS` = **245457**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 311 (2026-05-07):** pun prolaz posle Val 310 (smoke) — **exit `0`** (~234 s, spoljni `OUTER_WALL_MS` = **233633**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 313 (2026-05-07):** pun prolaz posle Val 312 (smoke) — **exit `0`** (~231 s, spoljni `OUTER_WALL_MS` = **231331**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 315 (2026-05-07):** pun prolaz posle Val 314 (smoke) — **exit `0`** (~249 s, spoljni `OUTER_WALL_MS` = **248944**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 317 (2026-05-07):** pun prolaz posle Val 316 (smoke) — **exit `0`** (~244 s, spoljni `OUTER_WALL_MS` = **243945**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 319 (2026-05-07):** pun prolaz posle Val 318 (smoke) — **exit `0`** (~213 s, spoljni `OUTER_WALL_MS` = **212821**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 321 (2026-05-07):** pun prolaz posle Val 320 (smoke) — **exit `0`** (~224 s, spoljni `OUTER_WALL_MS` = **224197**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 323 (2026-05-07):** pun prolaz posle Val 322 (smoke) — **exit `0`** (~212 s, spoljni `OUTER_WALL_MS` = **211969**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 325 (2026-05-07):** pun prolaz posle Val 324 (smoke) — **exit `0`** (~211 s, spoljni `OUTER_WALL_MS` = **210687**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 327 (2026-05-07):** pun prolaz posle Val 326 (smoke) — **exit `0`** (~214 s, spoljni `OUTER_WALL_MS` = **214229**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 329 (2026-05-07):** pun prolaz posle Val 328 (smoke) — **exit `0`** (~227 s, spoljni `OUTER_WALL_MS` = **226931**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 331 (2026-05-07):** pun prolaz posle Val 330 (smoke) — **exit `0`** (~222 s, spoljni `OUTER_WALL_MS` = **221660**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 333 (2026-05-07):** pun prolaz posle Val 332 (smoke) — **exit `0`** (~246 s, spoljni `OUTER_WALL_MS` = **245910**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 335 (2026-05-07):** pun prolaz posle Val 334 (smoke) — **exit `0`** (~215 s, spoljni `OUTER_WALL_MS` = **214914**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 337 (2026-05-07):** pun prolaz posle Val 336 (smoke) — **exit `0`** (~240 s, spoljni `OUTER_WALL_MS` = **239799**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 339 (2026-05-07):** pun prolaz posle Val 338 (smoke) — **exit `0`** (~213 s, spoljni `OUTER_WALL_MS` = **213245**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 341 (2026-05-07):** pun prolaz posle Val 340 (smoke) — **exit `0`** (~245 s, spoljni `OUTER_WALL_MS` = **244667**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Val 343 (2026-05-07):** pun prolaz posle Val 342 (smoke) — **exit `0`** (~255 s, spoljni `OUTER_WALL_MS` = **254848**); zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

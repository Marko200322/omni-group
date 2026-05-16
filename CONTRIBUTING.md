# Contributing — Omni Group monorepo

## Granice i merge redosled (Nivo 1)

Pri PR-ovima prati **`NIVO-1-MASTER-CHECKLIST.md`** — agenti **01–06** imaju **strogo odvojene foldere**. Redosled merge-a na `main`:

1. **01** Infra (`.github/`, root compose, `scripts/`, root `README*`, `NIVO-1*.md`, `SYSTEM-MAP.md`)
2. **02** Python (`src/`, `tests/`, root `Dockerfile`, `docker-compose.yml`, `requirements.txt`)
3. **03** Nest (`atina-system/**`)
4. **04** Node jezgro (`atina-platform/atina/src/{core,config,database,queue,utils}` — **bez** `src/modules/`)
5. **05** + **06** paralelno ako nema konflikta: **05** `docs/operations` + platform README; **06** `scripts/`

### Operativa (kratki linkovi)

- [`docs/OBSERVABILITY-RUNBOOK.md`](./docs/OBSERVABILITY-RUNBOOK.md)
- [`docs/PYTHON-ASTRA-OPS.md`](./docs/PYTHON-ASTRA-OPS.md)
- [`atina-platform/atina/docs/operations/LOGGING-NOTES.md`](./atina-platform/atina/docs/operations/LOGGING-NOTES.md)

## Komande pre PR-a (lokalno)

Root skripte **[`smoke-stack.ps1`](./scripts/smoke-stack.ps1)** (multi-stack HTTP; uz podignut Atina Node API koristi i **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) i **[`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); pun CI mirror); **Get-Help** i pravila: **[`scripts/README.md`](./scripts/README.md)** (**Port mismatch** na punom Nest `verify:ci` — isti fajl). **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova · Novi Val / sync brojeva u dokovima (celokupan repo):** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Atina Node (kad je API podignut):** iz `atina-platform/atina` pokreni **`npm run smoke:all`** — redosled koraka i troubleshooting: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). `smoke-stack.ps1` za Node proverava samo **`GET /health`** kada je uključen — vidi isti [`scripts/README.md`](./scripts/README.md). **Next (`omnigroup-web`) vs Atina:** kanonski SaaS backend — [`docs/FAZA-4-SAAS-DECISION.md`](./docs/FAZA-4-SAAS-DECISION.md).

- **Next `omnigroup-web`** — **`/dev/*`** je `noindex` (layout) + **`/robots.txt`** zabranjuje crawlere za `/dev/`; **`/sitemap.xml`** i kanonski host preko **`NEXT_PUBLIC_SITE_URL`** (vidi [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md)). Brzi hub dokova u browseru: **`/dev/docs`** (**`metadata`** + **`#dev-docs-search`** u opisu kartice, [`section-heading-id.ts`](./apps/omnigroup-web/src/app/dev/docs/section-heading-id.ts) + stavke u [`page.tsx`](./apps/omnigroup-web/src/app/dev/docs/page.tsx); pretraga + **`nav` preskok** (**`#dev-docs-filter`** → **`#dev-docs-search`** → opciono **`#dev-docs-quick-jump`** → **`#dev-docs-list`**) + **`nav` *Brzi skok*** (**`#sec-…`**, lista prati filter) u [`DevDocsSections.tsx`](./apps/omnigroup-web/src/app/dev/docs/DevDocsSections.tsx) — **hash skrol** i **preskok blok** poštuju **`prefers-reduced-motion`**; **`role="search"`** (**`#dev-docs-search`**) + **`aria-keyshortcuts`** (Ctrl/⌘+K, **`/`**) + **`output`** (statistika, **`htmlFor`** na filter, **`aria-relevant="text"`**) + **`aria-controls`** (**`dev-docs-quick-jump`** / **`dev-docs-empty`** po kontekstu) + **`aria-describedby`**, sidra **`#sec-…`**, **ukupno/prikaz**, filter + istaknuti segmenti + prazan rezultat (`#dev-docs-empty`) + kopiranje putanje + pun link + **hash** (`#…`) + link po sekciji + **Obriši** + Esc + Ctrl/⌘+K + **`/`** (van polja) + **`?q=`**; tastaturni preskok u **`DevDocsSections.tsx`**: **`#dev-docs-filter`**, **`#dev-docs-search`**, opciono **`#dev-docs-quick-jump`**, **`#dev-docs-list`**). Produkcioni sajt i dalje indeksira javne stranice.

Ako `pytest` nedostaje: iz korena `pip install -r requirements.txt` (vidi komentar u tom fajlu i [`tests/README.md`](./tests/README.md)). Ako pri `pytest` vidiš **`MemoryError`**, vidi istu temu u [`NIVO-1-START.md`](./NIVO-1-START.md) (odeljak Python).

```powershell
Set-Location "path\to\omni group"
python -m pytest -q
Set-Location "atina-platform\atina"
npm run test:ci
Set-Location "..\..\apps\omnigroup-web"
npm ci
npm run build
Set-Location "..\..\atina-system"
# Pun isti red kao CI (monorepo) — job python / Python (Doslednost dok + pytest) — docs/GIT-BRANCH-PROTECTION.md; vidi verify-monorepo.ps1 (Postgres + migracije + e2e):
npm run verify:ci
# Brzi Nest samo build+test (ne zamena za CI): npm run verify:n1
```

*(PowerShell 5.1: koristi `;` umesto `&&` u jednoj liniji.)*

### Jedan prolaz — [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md))

**CI paritet:** Isti red kao ručno gore (`audit-doc-gate-references.ps1` — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) → pytest → `test:ci` → **`apps/omnigroup-web`** `npm ci` + `build` → `verify:ci`), plus na kraju **tri** **`docker compose config`** (Nest merge, root Python, Atina Node `docker-compose.yml`) kao CI job **`compose`**. Podrazumevano zahteva **Postgres** na hostu (obično **`localhost:5432`**; kredencijali kao u [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) i u `atina-platform/atina/docker-compose.yml`: `atina_user` …) i **Docker** za compose korak. **Windows + Docker Desktop:** ako `migration:run` / `pg` padaju na `5432`, koristi **`DB_PORT_EXPOSE=5433`** pri `docker compose up -d postgres` i **`POSTGRES_PORT=5433`** pre skripte — vidi [`scripts/README.md`](./scripts/README.md) (**Port mismatch** ako **`POSTGRES_PORT`** u shell-u ne prati stvarni host port). Bez Postgresa: **`-SkipNestVerifyCi`** — lokalno se u `atina-system` pokreće **`verify:n1`** umesto **`verify:ci`**; za pun Nest gate lokalno podigni Postgres i pokreni skriptu bez tog switch-a. Ako koristiš GitHub Actions, job **`atina-system`** i dalje pokreće pun **`verify:ci`** na runneru. Bez Next build-a lokalno: **`-SkipOmnigroupWeb`** (CI job **`omnigroup-web`** i dalje prolazi na GitHubu). Bez doc gate audita samo lokalno: **`-SkipDocAudit`** (job **`python`** na GitHubu i dalje pokreće audit).

```powershell
Set-Location "path\to\omni group"
# Required check ime: docs/GIT-BRANCH-PROTECTION.md (Python (Doslednost dok + pytest) / job python)
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1  # docs/GIT-BRANCH-PROTECTION.md
# Bez Docker-a (compose se preskače; na GitHubu job compose i dalje validira compose ako koristiš Actions):
# powershell ... -File .\scripts\verify-monorepo.ps1 -SkipCompose  # docs/GIT-BRANCH-PROTECTION.md
# Bez Postgresa (lokalno verify:n1; puni Nest `verify:ci` lokalno kad podigneš Postgres; na GitHub runneru puni `verify:ci` ako koristiš Actions):
# powershell ... -File .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi  # docs/GIT-BRANCH-PROTECTION.md
# Bez Omnigroup Next build-a lokalno (CI job omnigroup-web ne menja se):
# powershell ... -File .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb  # docs/GIT-BRANCH-PROTECTION.md
# Bez doc gate audita lokalno (job python na GitHubu i dalje pokreće audit):
# powershell ... -File .\scripts\verify-monorepo.ps1 -SkipDocAudit  # docs/GIT-BRANCH-PROTECTION.md
```

Detalji i **Port mismatch** (Nest/pg): [`scripts/README.md`](./scripts/README.md). U PowerShell-u: **`Get-Help .\scripts\verify-monorepo.ps1 -Full`**. Required check ime u Actions: [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md) (**`Python (Doslednost dok + pytest)`**).

**LATEST verify (pun red, uklj. `apps/omnigroup-web`):** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

### Nest (`atina-system`) — TypeORM migracije

- **`NODE_ENV=production`:** `synchronize` je uvek isključen; šema ide preko migracija (`src/database/migrations/`).
- **Lokalno:** podigni Postgres, postavi `.env`, zatim `npm run verify:ci` (ili `npm run build && npm run migration:run` posle testova). **Revert poslednje migracije:** `npm run migration:revert` (nakon `build`).
- **DataSource za CLI:** `src/database/data-source.ts` (nakon `npm run build` koristi `dist/database/data-source.js`).
- **Docker (`docker-compose.atina.yml`):** servis `atina-api` koristi **`NODE_ENV=${NEST_NODE_ENV:-production}`** (compose pregazi Dockerfile). Za **Bull** + [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) **`-NestQueueSmoke`** u kontejneru postavi npr. **`NEST_NODE_ENV=development`**. Dubinski Atina HTTP gate (login, Forge, …): **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). Opciono **`INTERNAL_QUEUE_SMOKE_KEY`** (i isti header u smoke skripti); opciono **`INTERNAL_QUEUE_SMOKE_RATE_*`** za rate limit POST `/internal/queue/smoke`; opciono **`TRUST_PROXY`** iza reverse proxy-ja — vidi `atina-system/.env.example`.
- **E2E (`npm run test:e2e`):** deo je `verify:ci` uz `E2E_WITH_DB=1`. Kad menjaš [`atina-system/test/app.e2e-spec.ts`](./atina-system/test/app.e2e-spec.ts), prati napomenu o **`SchedulerRegistry`** / cron pre `app.close()` u [`atina-system/README.md`](./atina-system/README.md) (*CI*).

## CI

`main` branch protection (GitHub Settings): [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md).

**Bez GitHub-a:** isti monorepo gate lokalno — **[`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · **[`smoke-stack.ps1`](./scripts/smoke-stack.ps1)** (multi-stack HTTP posle servisa; Atina Node = **`GET /health`**) · po potrebi **`npm run smoke:all`** u `atina-platform/atina` — [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **[`scripts/README.md`](./scripts/README.md)** (**Port mismatch** Nest/pg; nije potreban Actions niti push). **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Bez pristupa GitHub admin / org Settings:** šta tačno pokreće zelene job-ove na `main`, da li trebaju secrets, i kako se **branch protection** odnosi na inženjerski gate — vidi kratke odeljke *Isti gate lokalno kao u Actions* i *Zeleno na `main` u Actions vs branch protection* u [`docs/NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) (F.4 — matrica koraka). Koraci za vlasnika repoa (Settings → branch protection): [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md).

GitHub Actions (opciono, za `main` / tim): **`.github/workflows/ci-monorepo.yml`** — jobovi **`python`** (prvo `audit-doc-gate-references.ps1`, zatim `pytest`; ista **Doslednost dok** doc gate pravila (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); u Actions UI obično **Python (Doslednost dok + pytest)** — tabela i branch protection: [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), **`atina-saas`** (`test:ci`), **`omnigroup-web`** (`npm ci` + `npm run build` u `apps/omnigroup-web`), **`atina-system`** (`verify:ci` na Postgres servisu), **`compose`** (`docker compose config` za Nest merge `docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml`, korenski `docker-compose.yml`, `atina-platform/atina/docker-compose.yml`). Ručno: Actions → **CI (monorepo)** → Run workflow. Dependabot: samo **`.github/dependabot.yml` na korenu repoa** (npm za `atina-system` i `atina-platform/atina`, pip, GitHub Actions). **F.4** (zeleni gate — Actions **ili** lokalno, ista inženjerska sekvenca; matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Preostale otvorene stavke u CEO sekcijama A–H:** npr. Git (**CEO sekcija A**), TypeORM prod (**CEO sekcija C**), Node (**CEO sekcija G**) — matrica [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md); mapa i šabloni u [`docs/CEO-OPEN-BULLETS-RUNBOOK.md`](./docs/CEO-OPEN-BULLETS-RUNBOOK.md). U novim evidencijama koristi **relativne putanje** ili placeholder `<koren-klona>` — ne commit-uj mašinski specifične apsolutne putanje.

Ulaz za Nivo 1: **`NIVO-1-START.md`**. Nivo 2 (moduli / E2E): **`NIVO-2-START.md`** — granice **Agent 5–8** iz **`AGENT-RADNI-PLAN.md`** (ne mešati `src/modules/**` između paralelnih PR-ova bez dogovora).

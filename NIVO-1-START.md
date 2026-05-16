# Nivo 1 — brzi start (malo vremena / budžet)

**N1 master lista (6 agenata, ~3 meseca; operativni koraci):** [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md)

Cilj: **operativna stabilnost** (CI, build, test, smoke, jasni env-ovi). Dalji razvoj preko API-ja — **bez** punog Master Spec/E2E obima sada.

**Pun sistem (matrica CEO sekcija A–H):** [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md). Preostale otvorene stavke u matrici + šabloni za zatvaranje: [`docs/CEO-OPEN-BULLETS-RUNBOOK.md`](./docs/CEO-OPEN-BULLETS-RUNBOOK.md). **Monorepo evidencija (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next (Omnigroup):** uz `npm run dev` u `apps/omnigroup-web`, interni hub dokova je **`/dev/docs`**; **`/robots.txt`**, **`/sitemap.xml`** i **`NEXT_PUBLIC_SITE_URL`** — [`apps/omnigroup-web/README.md`](./apps/omnigroup-web/README.md). Proširena lista repo putanja (N1, gate skripte, Nest queue smoke, …): [`apps/omnigroup-web/src/app/dev/docs/page.tsx`](./apps/omnigroup-web/src/app/dev/docs/page.tsx).

**Windows PowerShell 5.1:** u jednoj liniji koristi **`;`** umesto **`&&`** između komandi (ili PowerShell 7+, ili `cmd /c "cd ... && ..."`).

## Redosled (jedan dan / jedna nedelja)

### 1) Monorepo gate (F.4 — lokalno ili GitHub)

- **Lokalno (ne mora Actions):** iz korena pokreni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) — isti red kao workflow **CI (monorepo)** (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** gde se indeks pominje, u [`scripts/README.md`](./scripts/README.md) → pytest → `test:ci` → `apps/omnigroup-web` build → `verify:ci` + tri `docker compose config`). Kad su stackovi podignuti, HTTP smoke: [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack; Atina Node na stubu = **GET** `/health` — detalji u **odjeljku 5** ispod). **Bundled Atina** (login, `/me`, Forge, admin): iz `atina-platform/atina` **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). Opcije i **Get-Help:** [`scripts/README.md`](./scripts/README.md). **Windows + Docker Desktop:** ako Nest `migration:run` puca na `localhost:5432`, vidi **`DB_PORT_EXPOSE` / `POSTGRES_PORT`** u [`scripts/README.md`](./scripts/README.md) (**Port mismatch** ako env port ne prati stvarni host port). Šta znači **F.4** bez obaveznog GitHub-a: [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).
- **GitHub (opciono):** posle `git push` proveri da **`ci-monorepo`** prolazi: u job-u **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) prvo `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)), zatim `pytest`; `atina-platform/atina` `npm run test:ci`, job **`omnigroup-web`** (`apps/omnigroup-web` build), `atina-system` `npm run verify:ci` (build + test + migracije + e2e na Postgres servisu u CI), job **`compose`** (tri `docker compose config`: Nest merge, root Python, Atina Node `docker-compose.yml`). Evidencija / timski koraci (F.4 — matrica koraka): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md).

### 2) Lokalno — Python (2 min)

Prvi put (nema `pytest` u okruženju): iz korena `pip install -r requirements.txt`. Više: [`tests/README.md`](./tests/README.md), PR komande: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

```powershell
Set-Location "<koren-klona-omni-group>"   # npr. repo root na tvojoj mašini
python -m pytest -q
```

Ako `pytest` padne sa **`MemoryError`** pri startu (retko, npr. Store Python + malo slobodnog RAM-a): ponovi komandu, zatvori druge teške procese ili koristi **venv** sa instaliranim `python.org` Pythonom.

### 3) Lokalno — Nest `atina-system` (preporuka: van OneDrive za `npm ci`)

Podigni Postgres (npr. `docker compose -f docker-compose.atina.yml up -d atina-postgres` iz korena) i postavi `.env` kao u `.env.example`.

```powershell
cd atina-system
npm ci
npm run verify:ci
```

Brzi samo build+unit (bez migracija/e2e): `npm run verify:n1`. Kopiraj `.env.example` → `.env` i prilagodi. **Produkcija:** `TYPEORM_SYNC=false` (obavezno pre pravog launcha); šema preko migracija.

### 4) Lokalno — Atina Node SaaS

```powershell
cd atina-platform\atina
npm ci
npm run test:ci
```

Za živi server + DB: `npm run db:up`, `npm run migrate`, `npm run dev` (vidi platform README).

### 4b) Jedan prolaz skriptom (opciono)

Iz korena repoa: [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) — `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)), pytest, `test:ci`, **`apps/omnigroup-web`** `npm ci` + `build`, `verify:ci` (Postgres na hostu, obično **localhost:5432**; na Windows ponekad **5433** — [`scripts/README.md`](./scripts/README.md); **Port mismatch** ako **`POSTGRES_PORT`** ne prati objavljeni port), zatim **tri** **`docker compose config`** (Nest merge, root Python, Atina Node — kao CI job **`compose`**). Bez Docker-a: **`-SkipCompose`**. Bez Postgresa (samo lokalno): **`-SkipNestVerifyCi`** (u `atina-system` tada **`verify:n1`**, ne **`verify:ci`**). Bez Next build-a: **`-SkipOmnigroupWeb`**. Samo lokalno bez doc gate audita: **`-SkipDocAudit`** (CI job **`python`** na GitHubu prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); i dalje pokreće audit). Vidi [`scripts/README.md`](./scripts/README.md) i [`CONTRIBUTING.md`](./CONTRIBUTING.md). **F.4** (tim / evidencija): [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). PowerShell: **`Get-Help .\scripts\verify-monorepo.ps1 -Full`**. **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08).

### 5) Smoke (kada servisi rade)

- **Multi-stack (Astra + Nest :3001):**  
  Ručni Astra + smoke kontekst: [`docs/PYTHON-ASTRA-OPS.md`](./docs/PYTHON-ASTRA-OPS.md).  
  `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-stack.ps1` · za širi Atina Node HTTP gate (nakon što je API gore): **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).  
  PowerShell: **`Get-Help .\scripts\smoke-stack.ps1 -Full`** · [`scripts/README.md`](./scripts/README.md) · bundled Atina HTTP: **`npm run smoke:all`** (stavak *Samo Atina platform* ispod).  
  (prethodno: root `docker compose up -d`, i Nest sa `docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml`.)  
  Ako **`smoke-stack.ps1 -SkipNode:$false`** puca na Atina Node **`http://127.0.0.1:3000/health`** sa *Empty reply* / *connection closed* dok `docker exec atina_app` unutra vidi **200**, probaj **`docker restart atina_app`** (Docker Desktop + dug `uptime` kontejnera — **LATEST smoke** (**sekcija H**) **Val 351** / 2026-05-14 u [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md); ranije **Val 348** / 2026-05-08); za puna Atina HTTP provera koristi **`npm run smoke:all`** (stavak *Samo Atina platform* ispod).  
  Ako je Nest u **Dockeru** i želiš **Bull** + **`-NestQueueSmoke`**, pre `docker compose up` postavi npr. **`$env:NEST_NODE_ENV='development'`** (inace u kontejneru ostaje **production** i POST smoke vraća **404**). Opciono **`INTERNAL_QUEUE_SMOKE_KEY`** u okruženju za isti ključ u Nest kontejneru.  
  Opciono na smoke skripti: **`-NestQueueSmoke`** — ako health ima `bull.enabled`, šalje **POST** `/internal/queue/smoke`. Ako Nest zahteva ključ, **`-NestQueueSmokeKey`** ili **`$env:INTERNAL_QUEUE_SMOKE_KEY`**. Učestali POST mogu dobiti **429** (Nest in-memory rate limit; vidi `atina-system/README.md` / `.env.example`). Iza reverse proxy-ja na Nest-u postavi **`TRUST_PROXY=1`** (tačniji `req.ip` za taj limit).

- **Samo Atina platform (kad je API gore):** u `atina-platform/atina` — `npm run smoke:all` (redosled koraka i troubleshooting: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*; brzi gate: [`atina-platform/atina/docs/operations/NIVO-1-GATE.md`](./atina-platform/atina/docs/operations/NIVO-1-GATE.md)).

### 6) Šta još mora čovek (bez agenta)

- Staging `.env`, živi Stripe/PayPal ako treba, SMTP, DNS, TLS.
- Provera `docs/operations/release-gate-checklist.md` i `production-config-matrix.md` u platformi.
- **F.5** — u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) poglavlje **„Nivo 1 — F.5 brzi status“** — ažuriraj detaljne `[ ]` u **CEO sekcijama A, B, C, G i H** (N1 inženjerski opseg) kad tim potvrdi; **LATEST smoke** (**sekcija H**) = tri-stub dokaz za **CEO sekciju H**. Blokovi **CEO sekcija D**, **E**, **F** zatvaraju **Nivo 2** / **Nivo 3** planovi, ne F.5 za N1.

---

| Dokument | Svrha |
|----------|--------|
| `CHECKLIST-CEO-SISTEM.md` | Puna matrica; za Nivo 1 fokus na **CEO sekcije A, B, C, G i H**; **LATEST smoke** (**sekcija H**) = tri-stub dokaz za **CEO sekciju H** |
| `AGENT-RADNI-PLAN.md` | Raspodela agenata; poglavlje **Nivo 1 — aktivan raspored** |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Merge redosled agenata 01–06; komande pre PR-a |
| [`scripts/README.md`](./scripts/README.md) | [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) + **`npm run smoke:all`** (Atina; formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*), [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)); u PS: **Get-Help … -Full**; **Port mismatch** (Nest/pg) u istom README |
| [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) | **F.4** — matrica koraka; monorepo gate na `main` u Actions **ili** lokalno |
| [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) | Poslednji pun [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); uključuje **`apps/omnigroup-web`**) — **LATEST verify** (**Val 355** / 2026-05-14 sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13 — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)) |
| [`tests/README.md`](./tests/README.md) | Python `pytest` (root), Astra smoke napomene |
| `atina-platform/atina/docs/operations/NIVO-1-GATE.md` | Konkretne komande za Node SaaS gate |
| `SYSTEM-MAP.md` | Portovi i stackovi |
| [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) | Poslednji zapis multi-stack [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) + po potrebi **`npm run smoke:all`** (Atina) — **LATEST smoke** (**sekcija H**): **Val 351** / 2026-05-14 (tri stuba; Node `/health` length **247**; ranije **Val 348** / 2026-05-08 length **243**; vidi i **odjeljak 5** ispod) |

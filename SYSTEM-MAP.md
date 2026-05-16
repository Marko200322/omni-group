# Omni Group — Workspace System Map

## 1. Title and purpose

**Omni Group** workspace groups several runnable systems:

- **Python stack** (repo root): shared vault ledger, Forge + Atina worker processes, and the Astra HTTP surface — orchestrated via `docker-compose.yml` and multi-stage `Dockerfile` targets (`forge`, `atina`, `astra`).
- **Atina SaaS / platform (Node)** (`atina-platform/atina/`): production-style Express + TypeScript SaaS (payments, Forge module, Postgres, Redis, Bull).
- **Atina System (NestJS)** (`atina-system/`): Nest API wired for PDF Titanomnigroup/TSC scenarios, runnable locally or via **`docker-compose.atina.yml`** at repo root.

The purpose of this map is one place for **what exists**, **how to run it**, **ports**, **env highlights**, **naming distinctions**, pointers to specs, and a short **staging integration** gate (lista koraka) — without replacing per-project READMEs. Za **Nivo 1** granice agenata, gate-ove i tro-mesečni plan, koristi i **N1 master lista** **[`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md)** (link je i u odjeljak 4). **Monorepo verify (lokalno = CI mirror):** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)); puni red koraka u odjeljak 2 ispod. **Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

---

## 2. Runnable components (table)

| Component | Location | Stack | Ports (typical host) | Main commands | Env / highlights |
|-----------|----------|--------|----------------------|---------------|------------------|
| **Python — Forge worker** | Root `Dockerfile` target `forge` + root `docker-compose.yml` (`forge`) | Python 3.12 | _(no HTTP; background)_ | `docker compose build --target forge` / `docker compose up forge` (with stack) | `VAULT_PATH` (e.g. `/data/vault.db` in compose), `INITIAL_BUDGET_RSD`, `FORGE_INTERVAL_SEC`, `FORGE_COST_MIN_RSD`, `FORGE_COST_MAX_RSD` |
| **Python — Atina worker** | Root `Dockerfile` target **`atina`** + compose service `atina` | Python 3.12 | _(no HTTP)_ | Same pattern; compose service `depends_on: forge` | `VAULT_PATH`, `INITIAL_BUDGET_RSD`, `ATINA_INTERVAL_SEC`, `ATINA_BATCH_LIMIT` |
| **Python — Astra (Gunicorn)** | Root `Dockerfile` target `astra` + compose `astra` | Python 3.12 / Gunicorn | **8080** → container 8080 | `docker compose up` (includes astra after forge + atina) | `VAULT_PATH`, `PORT=8080` |
| **Full Python stack** | Root `docker-compose.yml` | All three + shared volume `vault_data` | **8080** (Astra only) | From repo root: `docker compose up -d --build` | Vault file at `VAULT_PATH: /data/vault.db`; shared `vault_data` volume |
| **Node SaaS — Atina platform** | `atina-platform/atina/` | Node 20, Express, Postgres 16, Redis 7 | **3000** (app); **5432** (postgres, overridable `DB_PORT_EXPOSE`); **6379** (redis, overridable `REDIS_PORT_EXPOSE`) | Host app + DB in Docker: `npm run db:up`, `npm run migrate`, `npm run seed`, `npm run dev` (or `dev:start`). Full compose: `cd atina-platform/atina && docker compose up -d --build` | `.env` from `.env.example`: `JWT_SECRET`, `DB_*`, `REDIS_*`, Stripe/PayPal, `SMTP_*`, `FORGE_VAULT_PATH` (default `data/vault.db`), etc. See platform README |
| **Nest — Atina System** | `atina-system/` + root **`docker-compose.atina.yml`** (+ merge **`docker-compose.nest-port-3001.yml`** radi CI/dok pariteta) | NestJS 10, Postgres 16, Redis 7 | **3001** (API na hostu → kontejner **3000**); Postgres **5433→5432**; Redis **6380→6379** | From repo root: `docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml up -d --build` (ili samo `-f docker-compose.atina.yml` — i dalje host **:3001**). Local: `npm run start:dev` in `atina-system` with matching env | `POSTGRES_*`, `JWT_SECRET` (≥32 u production), `PHASE`, `PORT`, `TYPEORM_SYNC` (compose sets sync true for bootstrap); **`CORS_ORIGINS`** u production compose; compose **`NODE_ENV=${NEST_NODE_ENV:-production}`**; opciono **`INTERNAL_QUEUE_SMOKE_KEY`** / **`INTERNAL_QUEUE_SMOKE_RATE_*`** (POST smoke); opciono **`TRUST_PROXY`** (1 / true iza LB); **`REDIS_*`** za Bull |

See [`docs/PYTHON-ASTRA-OPS.md`](./docs/PYTHON-ASTRA-OPS.md) for manual `/api/status` and smoke context.

**Port note:** **Atina Node SaaS** koristi host **:3000**. **Nest `atina-api`** u korenskom compose-u mapira host **:3001** → kontejner **3000**, tako da oba mogu paralelno na istoj mašini.

**Monorepo gates:** [`audit-doc-gate-references.ps1`](./scripts/audit-doc-gate-references.ps1) (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md)); repo root `python -m pytest`; u `atina-platform/atina` → `npm run test:ci`; u `apps/omnigroup-web` → `npm ci` + `npm run build`; u `atina-system` → `npm run verify:ci` (zahteva Postgres za migracije + e2e; brzi `verify:n1` = samo build+unit). **Isti red bez GitHub-a:** [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); opciono **`-SkipOmnigroupWeb`**, **`-SkipCompose`**, **`-SkipNestVerifyCi`** bez Postgresa — tada Nest **`verify:n1`**; **`-SkipDocAudit`** samo lokalno — bez lokalnog doc gate koraka; u Actions job **`python`** i dalje **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, pre `pytest`-a). **Ako koristiš GitHub:** [`.github/workflows/ci-monorepo.yml`](./.github/workflows/ci-monorepo.yml) — jobovi **`python`** (GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)), **`atina-saas`**, **`omnigroup-web`**, **`atina-system`**, **`compose`** (tri `docker compose config`). [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP; kada je Atina Node uključen, stub je **`GET /health`**) i **Get-Help** za obe skripte: [`scripts/README.md`](./scripts/README.md) (**Port mismatch** ako Nest **`POSTGRES_PORT`** ne prati objavljeni host port). **Dublji Atina Node HTTP** (login, `/me`, Forge, admin bundle): `atina-platform/atina` → **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **F.4 (tim):** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08). **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08). Lokalni PR redosled: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 3. How components relate

- **Vault / DB path (conceptual glue):** The root Python compose uses a **single SQLite vault** at `VAULT_PATH` (default in compose: `/data/vault.db` on a **named volume** `vault_data`) shared by **forge**, **atina** (Python worker), and **astra**. The Node platform’s Forge module uses **`FORGE_VAULT_PATH`** (often `data/vault.db` relative to that app’s cwd) — same *idea* (vault DB), different processes and paths unless you consciously align mounts/paths across stacks. **Concrete alignment options:** [`docs/VAULT-ALIGNMENT-NOTES.md`](./docs/VAULT-ALIGNMENT-NOTES.md).
- **Naming — “Atina” Node vs Python “atina” worker:**
  - **`atina-platform/atina`** = **Express SaaS “Atina”** (HTTP API, Postgres, Redis, billing, Forge module).
  - **Root compose service / Dockerfile target `atina`** = **Python worker** (`python -m atina.worker`), **not** the Node server. Prefer saying **“Python Atina worker”** vs **“Atina Node / platform”** when debugging or designing staging.

---

## 3b. Faza 4 (Noviteti) — front & pipeline

| Šta | Gde |
|-----|-----|
| Omnigroup Next.js (marketing + dashboard/admin shell) | **`apps/omnigroup-web/`** — README: robots/sitemap, **`NEXT_PUBLIC_SITE_URL`**, hub **`/dev/docs`** |
| YouTube / Celery lokalni pipeline | **`tools/youtube-pipeline/`** |

---

## 4. Pointers to existing docs

| What | Where |
|------|--------|
| SaaS contributor quick start, Forge ops, env reference | `atina-platform/atina/README.md` |
| Serbian runbook: local DB, env copy, migrate/seed, dev server, Docker full stack | **`RUN-ATINA-PLATFORM.txt`** (repo root and mirror under `atina-platform/atina/`) |
| PDF specifications / blueprints (Titan Omni, modules, Astra, etc.) | **`sve/`** — e.g. `TitanOmniGroup_ULTRA_Blueprint.pdf`, `Titan_System_Modules_Final.pdf`, `Titan_Astra_Full_Production.pdf`, `Titan_System_Ultimate_Node_Blueprint_*.pdf`, and related module/Craftor guides |
| Nested platform operational artifacts | Under `atina-platform/atina/`: `docs/operations/` (deploy runbook, config matrix, alerts) as referenced in README |
| **Master lista / matrica (celokupan workspace + 50 modula + PDF + prod gate)** | Repo root **`CHECKLIST-CEO-SISTEM.md`** |
| **Samo vlasnik (Git prod, migracije, plaćanja)** | **`docs/VLASNIK-ZAVRSAVA.md`** |
| **Agenti + timeline (nedelje/meseci do „završeno“)** | Repo root **`AGENT-RADNI-PLAN.md`** |
| **Nivo 1 — prvi koraci (malo vremena)** | Repo root **`NIVO-1-START.md`** |
| **Nivo 1 — N1 master lista (6 agenata, ~3 mes.)** | Repo root **`NIVO-1-MASTER-CHECKLIST.md`** |
| **Nivo 2 — N2 master lista (Master Spec, talasi, E2E)** | Repo root **`NIVO-2-START.md`**, **`NIVO-2-MASTER-CHECKLIST.md`** |
| **Nivo 3 — N3 master lista (PDF / CEO F)** | Repo root **`NIVO-3-START.md`**, **`NIVO-3-MASTER-CHECKLIST.md`** |
| **Root Python tests (`pytest`)** | Repo root **`tests/README.md`** |
| **PR / merge redosled monorepa** | Repo root **`CONTRIBUTING.md`** |

---

## 5. Next integration steps — pun staging gate (lista koraka)

Use this as a short gate before treating an environment as “integrated staging”:

- [ ] **Isolate ports:** Map Nest vs Node SaaS so both APIs are not both on host `3000`; document final URLs (e.g. reverse proxy prefixes or different host ports **3000 / 3001**).
- [ ] **Secrets and env parity:** Separate staging `.env` / compose overrides for Postgres, Redis, `JWT_SECRET`, payment webhooks vs production; validate `NODE_ENV` / SSL where required (platform README + `production-config-matrix` if applicable).
- [ ] **Vault strategy:** Decide whether staging uses Python volume vault only, Node `FORGE_VAULT_PATH` only, or a **mounted shared path**; avoid accidental divergence between Forge-on-Python and Forge-on-Node assumptions.
- [ ] **Orchestration order:** Bring up **deps first** (Postgres/Redis per stack), run **migrations** for Node SaaS and Nest separately, then workers (Python forge/atina if part of staging) then HTTP services; health-check **Python Astra `:8080`**, **Express `/health`**, **Nest** per its module.
- [ ] **Smoke / monitoring:** Platform: `atina-platform/atina` **`dev:check`** (uključuje **`npm run smoke:all`** + lint), pojedinačni **`smoke:*`**, Forge smokes — redosled bundled koraka (formalni Atina release gate): [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Smoke tests*). Add a minimal Nest health/auth check to the same runbook if not already scripted.
- [ ] **Multi-stack smoke (repo root):** With Python Astra up (`docker compose up` from root) and Nest on **:3001** (`docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml up -d --build`), run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-stack.ps1` (optional `-AtinaNodeBase http://127.0.0.1:3000` if Express SaaS is running — tada Node deo i dalje samo **`GET /health`**; za **`npm run smoke:all`** idi u `atina-platform/atina` i vidi formalni Atina release gate: [`release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests*; **`-NestQueueSmoke`** to POST Nest dev queue smoke when Bull is enabled). **LATEST smoke** (**sekcija H**, tri stuba): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).
- [ ] **Single runbook entry:** One staging doc (or extend `RUN-ATINA-PLATFORM.txt` with a “multi-stack” section) listing exact compose files, working directories, and **which “Atina” is which** for on-call.

---

## 6. Šta PDF-ovi kažu za „ceo sistem“ (kratak sažetak — ne pun tekst PDF-ova)

Izvor koji je **mašinski čitljiv** kao tekst u repou: `sve/Titan_System_Modules_Master_Spec_v2.pdf` — **Master Spec v2** sadrži npr.:

- **Lista od 50 modula** (Titan, Titan Core, Titan Master, Titan Monitor, Titanis, Titanix, Client Hunter, Scraper, Proxy & Rotation, Validator, Lead Scoring, CRM, Outreach, Follow-up Automation, Deal & Offer, Package & Pricing, Contracts, Digital Signature, Billing/Payment, Invoice, Subscription, Alert/Error/Logging/Security/Access Control, Audit Log, Phase Launch, Resource Management, Scaling, Load Balancer, Database Core, Backup & Recovery, Analytics, KPI, AI Learning & Memory, Titan Score, Recommendation, Compliance, GDPR, Public Website, Client Dashboard, Admin Dashboard, API Gateway, Integration Hub, Notification, Email, Template Engine, System Updater, itd.).
- **Implementaciona pravila (skraćeno):** analizirati kod, refaktor u pravcu modularne strukture, **stroga izolacija modula**, Titan Core kao orkestrator, Phase Launch kontroliše aktivaciju, konfiguracija u **env** (bez hardkoda), **unit testovi za svaki modul**, **integration testovi**, **puna simulacija** toka lead → deal → contract → payment, **zabrana migracije ako testovi padaju**, migracije + **rollback** pre deploya, **dev / test / prod** okruženja.

Ostali fajlovi u `sve/` (npr. `TitanOmniGroup_ULTRA_Blueprint.pdf`, `Titan_System_Ultimate_Node_Blueprint_*.pdf`, `Titan_Astra_Full_Production.pdf`, `Craftor_Full_Implementation_Guide.pdf`, `Titan_Supply_Core_PRO*.pdf`, `dominus360_system_blueprint.pdf`, `apex_predator_text.pdf`) šire domen (Astra, Forge/Craftor, supply, dominuse, „predator“ AI/ops sloj). **`apex_predator_text.pdf`** eksplicitno opisuje veliki distribuirani / K8s / swarm i AI proizvod — to je **širi vizuelni i poslovni opseg** nego što je u ovom workspace-u implementirano kao jedan spreman proizvod.

**Mapiranje (visoki nivo):** većina stavki iz liste 50 u Master Spec-u ima **paralelu u kodu** pod `atina-platform/atina/src/modules/` (rute/servisi). Dubina (potpuna izolacija, E2E simulacija, UI „Public/Client Dashboard“ kao zaseban proizvod) **varira po modulu** i mora se verifikovati ručno po modulu.

---

## 7. Koliko još do produktivnog / produkcijskog sistema (procene u %)

Jedan broj **nije dovoljan**, jer PDF „celokupan Titan“ i „deploy jednog ozbiljnog SaaS-a“ nisu isti cilj. Zato su **tri jasna spektra**:

| Spektrum | Šta znači | Približna spremnost | Šta još tipično nedostaje |
|----------|-----------|---------------------|----------------------------|
| **A — Operativna produkcija (Node SaaS `atina-platform/atina`)** | Stabilan go-live jednog glavnog API-ja sa plaćanjima, DB, monitoringom po vašem README/checklist-u | **~70–80%** | Živi Stripe/PayPal/Wise + webhooki, SMTP, staging dry-run, potvrda admin/monitoring endpointa, rollback vežban; dalje podizanje coverage grana koje su i dalje izvan `collectCoverageFrom` gde je rizik visok. |
| **B — Master Spec v2 (50 modula + pravila iz PDF-a)** | Potpuna usklađenost sa tekstom spec-a (test po modulu, simulacija celog toka, stroga izolacija, zabrana migracije pri padu testova) | **~35–50%** | End-to-end simulacija lead→payment kao **jedan** automatizovan gate; javni/klijentski dashboard moduli kao u spec-u ako se traže kao odvojeni proizvod; dokaz stroge izolacije modula. |
| **C — Celokupan workspace (`omni group`)** | Python (Forge/Atina/Astra) + Node SaaS + Nest + jedinstven vault/ops priča | **~55–65%** | Jedan dogovoreni vault model između Python i Node Forge-a; Nest **migracije** umesto `synchronize` u prod; `npm audit` / zavisnosti; isti monorepo gate lokalno: [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) (uklj. **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **Port mismatch** — [`scripts/README.md`](./scripts/README.md)); **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **LATEST verify** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2; ranije **Val 354** / 2026-05-13); **LATEST smoke** (**sekcija H**) [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14; na GitHubu opciono `ci-monorepo.yml` na `main`; opciono E2E preko svih servisa. |

**U proseku „koliko još“:**

- Do **Spektrum A** (razuman „produktivan“ SaaS): otprilike **još 20–30%** posla (uglavnom konfiguracija, bezbednost, staging/prod rituali, a ne „pisanje platforme od nule“).
- Do **Spektrum B** (doslovno PDF Titan master): otprilike ** još 50–65%** posla (dubina modula, E2E simulacija, eventualno veliki deo blueprint PDF-ova van Master Spec liste).
- **Celokupan opis u PDF-u (folder / stack u tekstu) + ambiciozni AI/K8s iz `apex_predator_text` i sličnih PDF-ova:** to je **poseban proizvod** — usporedba sa trenutnim repo-om daje **veliki jaz** (red veličine **60–80%** posla ako bi se to sve gradilo u ovom monorepo-u).

*Napomena: PDF binarni fajlovi nisu svi parsirani liniju po liniju; ovde je eksplicitno korišćen tekstualni sadržaj iz `Titan_System_Modules_Master_Spec_v2.pdf` i `apex_predator_text.pdf`; ostali PDF-ovi tretirani kao referenca po naslovu/nameni iz `sve/`.*

---

*This file is workspace-level documentation only; application source under `src/`, `atina-platform/`, and `atina-system/` is described here but not modified by this artifact.*

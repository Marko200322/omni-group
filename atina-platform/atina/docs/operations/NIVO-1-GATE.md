# Nivo 1 — minimalni gate za Atina Node SaaS

Cilj: brzo potvrditi da je **build + lint + unit testovi** zeleno i da postoje jasni koraci pre staging/prod.

**Posle uspešnog `smoke:all`:** popuni evidenciju prema [`NIVO-1-SMOKE-EVIDENCE.template.md`](./NIVO-1-SMOKE-EVIDENCE.template.md) (stavka **06.4** N1 master liste).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

**PowerShell 5.1:** Za ulančane komande koristi `;` umesto `&&` (npr. `npm ci; npm run test:ci`).

## 1. Bez servera (CI isto kao lokalno)

```bash
npm ci
npm run test:ci
```

Izlaz mora biti **0**; uključuje `tsc`, `eslint`, Jest + coverage pragove.

**Pun monorepo (isti Nivo 1, repo koren):** tamo još **prvo** [`audit-doc-gate-references.ps1`](../../../../scripts/audit-doc-gate-references.ps1) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** gde se indeks pominje, u [`scripts/README.md`](../../../../scripts/README.md), zatim **`python -m pytest`** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** u CI — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)), u **`apps/omnigroup-web`** → **`npm ci`** + **`npm run build`** (job **`omnigroup-web`** u CI), i u `atina-system` → **`npm run verify:ci`** (uz Postgres; **`POSTGRES_*`** mora pratiti host port — **Port mismatch** u [`scripts/README.md`](../../../../scripts/README.md)). U GitHub workflow-u **CI (monorepo)** job **`compose`** pokreće **tri** **`docker compose config --quiet`**: Nest (`docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml`), korenski Python stack (`docker-compose.yml`), i **ovaj** fajl **`atina-platform/atina/docker-compose.yml`**. Lokalno isti red kao CI (plus compose): [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) — bez Next build-a: **`-SkipOmnigroupWeb`**; bez Docker-a na kraju: **`-SkipCompose`**; bez Postgresa (samo lokalno): **`-SkipNestVerifyCi`** (Nest lokalno **`verify:n1`**); bez doc gate audita samo lokalno: **`-SkipDocAudit`** (u Actions job **`python`** i dalje pokreće audit). Kad su stackovi podignuti: [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node stub = **GET** `/health`; bundled **`npm run smoke:all`** u ovom paketu — [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*). Opcije i **Get-Help**: [`scripts/README.md`](../../../../scripts/README.md). Ulaz: [`../../../../NIVO-1-START.md`](../../../../NIVO-1-START.md), [`../../../../CONTRIBUTING.md`](../../../../CONTRIBUTING.md). **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

## 2. Sa Postgres + Redis (lokalno)

```bash
npm run db:up
npm run migrate
npm run seed   # opciono
npm run dev
```

U drugom terminalu (sa podignutim API-jem):

```bash
npm run smoke:all
```

(`smoke:all` → `scripts/smoke-all.ps1`: `/health`, jedan `POST /auth/login`, isti JWT za `/me`, `forge/status`, workflow execution-stats smoke, `forge-admin` — manji pritisak na auth rate limit; detalj [`release-gate-checklist.md`](./release-gate-checklist.md) — *Smoke tests*.)

Drugi host/port: `npm run smoke:all -- -BaseUrl "http://127.0.0.1:3001"`.

Ako nešto padne, vidi `README.md` sekcije o Forge vault putu i `.env`.

## 2b. Multi-stack smoke iz korena monorepa

Kad su podignuti i Python stack + Nest + (opciono) ovaj servis u Dockeru, iz **korena** repoa: [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) — za Atina Node i dalje samo **GET** `/health` na stubu; za login, `/me`, Forge i admin koristi **`npm run smoke:all`** (odjeljak 2) / [`release-gate-checklist.md`](./release-gate-checklist.md) (*Smoke tests*). Detalji u [`NIVO-1-START.md`](../../../../NIVO-1-START.md) odjeljak 5 i [`scripts/README.md`](../../../../scripts/README.md). Za **LATEST smoke** (**sekcija H**) — **tri stuba** (Astra + Nest + Atina Node): **`& .\scripts\smoke-stack.ps1 -SkipNode:$false`**. Ako sa hosta **`http://127.0.0.1:3000/health`** ne radi (prazan odgovor / connection closed), a unutar kontejnera **`atina_app`** `/health` vraća **200**, probaj **`docker restart atina_app`** — evidencija **Val 348** u [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md).

## 3. Pre produkcije (gate / stavke)

- `docs/operations/production-config-matrix.md` — obavezni env.
- `docs/operations/deploy-rollback-checklist.md` — redosled deploya.
- `README.md` — glavni blok **production readiness** (stavke / gate u README-u).

## 4. Van Nivoa 1 (kasnije)

- Širenje E2E kroz sve module, pun Master Spec — **ne** u ovom dokumentu.

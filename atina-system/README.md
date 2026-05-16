# Atina System (NestJS) — Nivo 1

API servis iz `omni group` monorepa. Za punu mapu stackova vidi **[`../SYSTEM-MAP.md`](../SYSTEM-MAP.md)**. Nivo 1: **[`../NIVO-1-START.md`](../NIVO-1-START.md)** · **[N1 master lista](../NIVO-1-MASTER-CHECKLIST.md)** (operativni koraci po agentima) · PR redosled **[`../CONTRIBUTING.md`](../CONTRIBUTING.md)**. Root skripte monorepa i **Get-Help**: **[`scripts/README.md`](../scripts/README.md)**. **Monorepo evidencija (indeks + dry-run):** **[`../docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md)** · **[`../docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md)**.

**Kad podižeš novi Val širom dokova:** **[`scripts/README.md`](../scripts/README.md)** — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

## Brzo (lokalno)

```bash
cp .env.example .env
# Podigni Postgres (npr. docker compose -f ../docker-compose.atina.yml up -d atina-postgres)
npm ci
npm run verify:ci
npm run start:dev
```

## Pun `npm run verify:ci` lokalno

Za isti red kao u CI mora da radi **Postgres**: `verify:ci` pokreće **`migration:run`** i **`test:e2e`**, pa oba koraka **zahtevaju DB**. Kopiraj [`.env.example`](./.env.example) u `.env` i uskladi `POSTGRES_*` (i ostalo što skripte očekuju) sa lokalnim kontejnerom — vidi **Brzo** za `docker compose` primer. Zatim `npm ci` i `npm run verify:ci`. Bez baze koristi **`npm run verify:n1`** (vidi **CI**). Lokalni Docker bez TLS: **`POSTGRES_SSL=false`** (podrazumevano u primeru). Managed Postgres sa TLS: **`POSTGRES_SSL=true`** (opciono **`POSTGRES_SSL_REJECT_UNAUTHORIZED=false`** samo uz svesni rizik).

**Windows + Docker Desktop:** ako `migration:run` javlja **ECONNRESET** / „connection terminated“ na **`localhost:5432`**, koristi host port **5433** i isti **`POSTGRES_PORT`** — [`scripts/README.md`](../scripts/README.md) (monorepo [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) isto; **Port mismatch** u istom README-u ako vidiš **ECONNREFUSED** na pogrešnom portu). **LATEST verify:** [`../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Ako `migration:run` padne sa „relation … already exists“:** ista Postgres instanca je verovatno već imala šemu (npr. Atina Node SaaS). Koristi **praznu** bazu / novi volumen za Nest (`docker compose` u `atina-platform/atina` + `docker volume rm …` za `atina_postgres_data` samo ako smeš da obrišeš lokalne podatke) ili drugi `POSTGRES_DB`.

TypeORM **production gate** (CEO sekcija C) — **[`docs/TYPEORM-PRODUCTION-CHECKLIST.md`](./docs/TYPEORM-PRODUCTION-CHECKLIST.md)**.

**Produkcija:** u `.env` postavi `TYPEORM_SYNC=false` i uvedi TypeORM migracije pre prvog deploya.

**Health:** `GET /` i `GET /health` — bez Redis env-a: `redis.configured: false`, `bull.enabled: false`. Sa `REDIS_HOST`: PING u `redis`, plus `bull: { enabled: true, queues: ['system'] }` (BullMQ worker registrovan). Operativa (logovi, Docker, smoke): **[`docs/HEALTH-AND-OPS.md`](./docs/HEALTH-AND-OPS.md)**.

**Dev queue smoke:** `POST /internal/queue/smoke` (van `NODE_ENV=production`) — ako je Bull uključen, dodaje posao `smoke` na red `system`; inače JSON sa `bull: false`. U produkciji ruta vraća **404**. Ako je postavljen **`INTERNAL_QUEUE_SMOKE_KEY`**, obavezno zaglavlje **`x-internal-queue-smoke-key`** sa istom vrednošću (inače **403**). In-memory rate limit: podrazumevano **60** zahteva po **60s** po klijentu (pre ključa); **`INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW=0`** ga gasi; **`INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS`** menja prozor — prekoračenje → **429**. Klijent za limit = prvi ne-prazan hop u **`X-Forwarded-For`** (string ili niz u zaglavlju; prazni segmenti se preskaču), inače **`req.ip`**. Iza reverse proxy-ja postavi **`TRUST_PROXY=1`** (ili **`true`**) da **`req.ip`** / prosleđeni lanac budu pouzdani. Prošireno (env, `curl`, produkcijski **404**): **[`docs/QUEUE-SMOKE-DEV.md`](./docs/QUEUE-SMOKE-DEV.md)**.

## Docker (iz repo korena)

```bash
docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml up -d --build
```

API na hostu **:3001** (izbegava konflikt sa Atina Node SaaS na :3000).

**Napomena:** u compose-u je **`NODE_ENV=${NEST_NODE_ENV:-production}`** (ne samo Dockerfile). Podrazumevano je **production** (`POST /internal/queue/smoke` → **404**). Za lokalni Bull + smoke: `NEST_NODE_ENV=development` (i po želji **`INTERNAL_QUEUE_SMOKE_KEY`**) u okruženju pre `docker compose up`. Iza reverse proxy-ja na hostu prosledi **`TRUST_PROXY=1`** u `atina-api` env (vidi korenski `docker-compose.atina.yml`).

## CI

Lokalni samo-Nest workflow: **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** (isti **`verify:ci`** kao monorepo job). Pun monorepo: **[`../.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); job **`omnigroup-web`**, **`compose`**: tri `docker compose config`). Brzi gate bez migracija/e2e: **`npm run verify:n1`**. Iz korena repoa, skripta **[`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) pokreće pun red (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), pytest, Atina **`test:ci`**, **`apps/omnigroup-web`** build, ovde **`verify:ci`**); bez Postgresa na hostu: **`-SkipNestVerifyCi`** — tada se ovde izvršava **`verify:n1`**; bez Next build-a: **`-SkipOmnigroupWeb`**; bez doc gate audita samo lokalno: **`-SkipDocAudit`** (detalji i **Port mismatch** u [`scripts/README.md`](../scripts/README.md)). Multi-stack HTTP smoke (Astra + Nest; Atina Node uključen = **`GET /health`**): **[`smoke-stack.ps1`](../scripts/smoke-stack.ps1)** · **LATEST smoke** (**sekcija H**): **[`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md)** (**Val 351** / 2026-05-14). **Atina bundled** (login, Forge, admin): **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: **[`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md)** (*Local notes — Smoke tests*). **F.4** (Actions na `main` **ili** lokalno; matrica koraka): **[`NIVO-1-F4-TIM-CHECKLIST.md`](../docs/NIVO-1-F4-TIM-CHECKLIST.md)**. **LATEST verify:** **[`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)** (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)).

**E2E (`npm run test:e2e`):** uz `E2E_WITH_DB=1` (kao u `verify:ci`). U [`test/app.e2e-spec.ts`](./test/app.e2e-spec.ts) pre `app.close()` zaustavljaju se svi registrovani cron poslovi (`SchedulerRegistry`, `@nestjs/schedule`), da periodični tick modula (npr. Supply Agent) ne ostavlja lažne DB greške u logu pri gašenju aplikacije.

Za npm audit na Nivo 1 vidi [`NPM-AUDIT-NIVO1.md`](./docs/NPM-AUDIT-NIVO1.md). `npm run audit:level1` pokreće `npm audit --omit=dev`; `npm run audit:json` emituje JSON izlaz.

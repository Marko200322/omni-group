# TypeORM: ugasiti `TYPEORM_SYNC` u produkciji i uvesti migracije

**CEO sekcija C / produkcija (kratak gate):** [`TYPEORM-PRODUCTION-CHECKLIST.md`](./TYPEORM-PRODUCTION-CHECKLIST.md).

Cilj: u produkciji **mora** biti `TYPEORM_SYNC=false` (vidi `src/app.module.ts`); šemu menjaš isključivo **migracijama**, ne `synchronize`.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## 1. Produkcijsko okruženje

- U CI / secret manager / `.env` na serveru: **`TYPEORM_SYNC=false`** (ili izostavi varijablu samo ako eksplicitno dokumentuješ default — trenutno je sync **uključen** sve dok vrednost nije tačno string `false`).
- Deploy redosled: prvo migracije, pa start aplikacije.

## 2. DataSource za CLI (jednokratno)

Dodaj npr. `src/database/data-source.ts` koji koristi **iste** kredencijale, **isti** `ssl` (u repou: [`postgres-ssl.util.ts`](../src/database/postgres-ssl.util.ts) deljeno sa `app.module.ts`) i **isti niz entiteta** kao `TypeOrmModule.forRoot` u `app.module.ts`, plus:

```ts
migrations: ['dist/database/migrations/*.js'],
synchronize: false,
logging: true, // opciono pri prvom pokretanju
```

Generisanje radi na `.ts` fajlovima; u runtime (`migration:run`) TypeORM u praksi koristi kompajlirane `.js` iz `dist/` nakon `npm run build`.

## 3. NPM skripte (preporučeno)

U `package.json` dodaj (prilagodi putanju do `-d` ako držiš `data-source` drugde):

```json
"typeorm": "typeorm-ts-node-commonjs",
"migration:generate": "npm run build && typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
"migration:run": "npm run build && typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
"migration:revert": "npm run build && typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
```

Za **generate** u razvoju često koristiš isti DB kao aplikacija; ime migracije zadaješ kao poslednji argument (vidi komandu ispod).

## 4. Komande (TypeORM 0.3 + Nest)

Iz korena `atina-system`:

```bash
# 1) Napravi prvu migraciju od razlike šema ↔ entiteti (razvojni DB treba da odgovara entitetima)
npm run migration:generate -- src/database/migrations/MigrationName

# 2) Proveri generisan SQL u fajlu, commituj migraciju
# 3) Na serveru / u CI pre starta:
npm run migration:run
```

Ako **generate** ne odgovara tvom setupu, alternativa: `migration:create` (prazan fajl) i ručno SQL, ili izvesti šemu iz dev baze (`pg_dump --schema-only`) i prepakovati u jednu inicijalnu migraciju posle revizije.

## 5. Ručni SQL (minimalno)

- U PG klijentu ili administracionom alatu izvrši isti SQL kao u `up()` grani generisane migracije (jednom po release-u).
- Drži verziju migracije u repou kao izvor istine za sledeće izmene.

## 6. Provera

- Lokalno: `TYPEORM_SYNC=false`, prazan ili sinhronizovan schema, `migration:run` prolazi bez greške, aplikacija se podiže.
- Produkcija: nikad `TYPEORM_SYNC=true`.
- **Pun monorepo** (isti red kao GitHub **CI (monorepo)** — job **`python`** (prikaz: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md)); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md)), pytest, Atina `test:ci`, **`apps/omnigroup-web`** build, ovde **`npm run verify:ci`** sa migracijama + e2e kad je Postgres na hostu, obično `localhost:5432`; na Windows + Docker Desktop ponekad **`5433`** — **[`scripts/README.md`](../../scripts/README.md)** (**Port mismatch** ako **`POSTGRES_PORT`** ne prati host port)): iz korena **[`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1)** · **[`smoke-stack.ps1`](../../scripts/smoke-stack.ps1)** (HTTP, opciono — Atina Node **GET /health**; **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests*) · **[`scripts/README.md`](../../scripts/README.md)** (opcije **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`**, **Get-Help**) · **LATEST verify:** **[`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)** (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): **[`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md)** (**Val 351** / 2026-05-14) · **F.4** (matrica koraka): **[`NIVO-1-F4-TIM-CHECKLIST.md`](../../docs/NIVO-1-F4-TIM-CHECKLIST.md)**.

Vidi i repo korenski **[`../../NIVO-1-MASTER-CHECKLIST.md`](../../NIVO-1-MASTER-CHECKLIST.md)** za širi nivo-1 kontekst.

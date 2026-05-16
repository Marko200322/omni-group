# npm audit — Nivo 1 (atina-system)

Izveštaj generisan iz korena `atina-system`. Skripte: **`npm run audit:level1`** (`npm audit --omit=dev`, samo produkcijske zavisnosti) i **`npm run audit:json`**. Puni audit: `npm audit`.

## Brojke (snapshot)

| Opseg | Ukupno | Low | Moderate | High |
|--------|--------|-----|----------|------|
| Sve zavisnosti (`npm audit`) | 23 | 4 | 12 | 7 |
| Samo produkcija (`--omit=dev`) | 10 | 0 | 6 | 4 |

## Top 5 nalaza (prioritet: `--omit=dev`)

1. **multer (high)** — transitivno kroz `@nestjs/platform-express`; više DoS advisory-ja. Popravka kroz tree često vuče **breaking** nadogradnju Nest/platform paketa (`npm audit fix --force`).
2. **lodash (high)** — transitivno kroz `@nestjs/config` (code injection / prototype pollution u starim verzijama). `npm audit fix` može da podigne lodash bez force-a u nekim verzijama — proveriti diff `package-lock.json`.
3. **@nestjs/core (moderate)** — GHSA-36xv-jgw5-4q75 (output neutralization / injection kontekst). Povezan sa starijom granom platform-express; rešenje tipično **aligned bump** @nestjs paketa na podržanu 11.x liniju, ne nasumičan jedan paket.
4. **file-type (moderate)** — kroz `@nestjs/common` (ZIP/ASF parser problemi). Često adresabilno uz konsolidovan Nest `@nestjs/common` bump sa ostatkom monolita.
5. **uuid (moderate)** — u root `uuid`, `bullmq`, `typeorm` nested zavisnostima (buffer bounds u v3/v5/v6). **Force** instalira `uuid@14` i može da pokida peer očekivanja; zahteva ručnu proveru i verovatno nadogradnje bullmq/typeorm kad budu spremni.

## Preporučeni sledeći korak (bez masovnog bumpa u ovom tasku)

1. Pokreni **`npm audit fix`** (bez `--force`), pregledaj `package-lock.json` i gate (`npm ci && npm run verify:ci` uz Postgres za migracije + e2e).
2. Zaseban PR: planiraj **koordinisanu** nadogradnju `@nestjs/*` na istu major/minor liniju koja rešava multer + core/file-type lanac, sa changelog čitanjem — ne `npm audit fix --force` naslepo na mainu.

Za širi kontekst vidi **[`../../NIVO-1-MASTER-CHECKLIST.md`](../../NIVO-1-MASTER-CHECKLIST.md)**.

Jedan red celog monorepa (na GitHubu job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) + pytest + Atina `test:ci` + **`apps/omnigroup-web`** build + ovde `verify:ci`, plus tri `docker compose config`): **[`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1)** · **[`smoke-stack.ps1`](../../scripts/smoke-stack.ps1)** (HTTP, opciono — Atina Node **GET /health**; **`npm run smoke:all`:** [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests*) · **[`scripts/README.md`](../../scripts/README.md)** (opcije **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`**, **Get-Help**, **Port mismatch** za Nest/pg) · **LATEST verify:** **[`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)** (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): **[`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md)** (**Val 351** / 2026-05-14) · **F.4:** **[`NIVO-1-F4-TIM-CHECKLIST.md`](../../docs/NIVO-1-F4-TIM-CHECKLIST.md)**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

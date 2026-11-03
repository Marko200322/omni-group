# 11 — Razvoj i testiranje

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md) · Sledeće: [`12-DEPLOY-I-OPERACIJE.md`](./12-DEPLOY-I-OPERACIJE.md)

## Preduslovi

| Alat | Verzija | Za šta |
|------|---------|--------|
| Node | 20+ (Cloud Agent: 22) | Atina, Nest, web |
| Python | 3.12 | Forge/Astra, pipeline, pytest |
| PowerShell | 7.x (`pwsh`) | Sve `scripts/*.ps1` (audit, smoke, e2e) |
| Postgres | 15/16 | Atina (`atina_saas_db`), Nest (`atina`, `atina_ci`) |
| Redis | 7 | Bull, Celery |
| Docker (opciono) | — | compose varijante, CI `compose` job |

## Lokalni start (ručno)

```bash
# 1) Atina Express
cd atina-platform/atina && npm ci && npm run db:up && npm run migrate && npm run seed && npm run dev   # :3000

# 2) Omnigroup web
cd apps/omnigroup-web && npm ci && cp .env.example .env.local && npm run dev                          # :3010

# 3) Nest (opciono)
cd atina-system && npm ci && cp .env.example .env && npm run start:dev                                # :3001

# 4) Python stack (opciono)
pip install -r requirements.txt && PYTHONPATH=src VAULT_PATH=data/vault.db python -m astra.app        # :8080
```

Redosled komandi za Nivo 1 (sa Windows/PowerShell 5.1 napomenama): [`../../NIVO-1-START.md`](../../NIVO-1-START.md).

## Cloud Agent okruženje (Cursor)

Okruženje je pre-build snapshot: zavisnosti instalirane, lokalni Postgres 16 i Redis, a start skripta `/usr/local/bin/omni-cloud-start` podiže četiri tmux sesije:

| tmux sesija | Komanda | Log |
|-------------|---------|-----|
| `astra` | `PYTHONPATH=src VAULT_PATH=<vault>/vault.db PORT=8080 python3 -m astra.app` | `/tmp/omni-astra.log` |
| `atina-api` | `npm run dev` u `atina-platform/atina` | `/tmp/omni-atina-api.log` |
| `atina-system` | `npm run start:dev` u `atina-system` | `/tmp/omni-atina-system.log` |
| `omnigroup-web` | `npm run dev -- --hostname 0.0.0.0` u `apps/omnigroup-web` | `/tmp/omni-web.log` |

Baze: `atina_saas_db` (migrate + seed urađeni pri startu), `atina` (Nest dev, `TYPEORM_SYNC`), **`atina_ci`** — prazna baza namenjena isključivo `npm run verify:ci` u Nestu (`POSTGRES_DB=atina_ci`), da `migration:run` radi na šemi koju dira samo migracija, kao u CI.

Praktična pravila u Cloud Agentu:

1. Pre `npm run build` u webu zaustavi dev server (`tmux send-keys -t omnigroup-web C-c`), obriši `.next`, pa posle builda ponovo pokreni dev server — dele isti `.next` folder.
2. Duge komande (build, jest, e2e) pokreći u sopstvenoj tmux sesiji i čitaj log fajl.
3. Produkcione tajne ne postoje u VM-u; sve integracije rade u fallback režimu (vidi [`10-KONFIGURACIJA-I-ENV.md`](./10-KONFIGURACIJA-I-ENV.md)).

## Testovi po komponenti

| Komponenta | Komanda | Obim | Vreme (orijentaciono) |
|------------|---------|------|-----------------------|
| Python | `python -m pytest -q` | 11 testova | sekunde |
| `sistem_naplate` | `python -m pytest sistem_naplate/tests -q` | 4 | sekunde |
| Atina | `npm test` (ili `npm run test:unit`) | 3449 testova / 350 suita | ~10 min |
| Atina CI paket | `npm run test:ci` | build + eslint + jest coverage | ~15 min |
| Web | `npm run build` + `npm test` | build je gate; test = normalizacija | ~3 min |
| Nest | `npm run verify:n1` / `npm run verify:ci` | 32 spec + e2e | ~2 min |

Testovi koji moraju da se dopune kad se menja katalog isporuka: `src/tests/unit/deliverable-handlers.registry.test.ts`, `src/tests/unit/fulfillment-quality-checklist.test.ts`, `src/tests/unit/modules/billing/dynamic-pricing.test.ts`, `src/tests/unit/plan-deliverable-map*.test.ts`, plus `scripts/e2e-fulfillment-all-packages.ps1` (`$allIds`).

## HTTP smoke i e2e (potrebni živi servisi)

| Skripta | Šta proverava |
|---------|---------------|
| `scripts/smoke-stack.ps1` (koren) | Multi-stack: Astra `/api/status`, Nest `/health`, Atina `GET /health` |
| `npm run smoke:all` u `atina-platform/atina` | Dublji Atina gate: health, auth/login, `/me`, Forge status, admin bundle — formalni release gate u `docs/operations/release-gate-checklist.md` |
| `scripts/smoke-web-integration.ps1` | Web BFF ↔ Atina |
| `scripts/e2e-billing-manual.ps1`, `scripts/e2e-register-plan-payment.ps1` | Ručna uplata i registracija + plan kroz web |
| `scripts/e2e-fulfillment-all-packages.ps1` | Kupovina + fulfillment svih 25 paketa, proverava artefakte i QA |
| `scripts/smoke-hunting-integration.ps1` | Hunting stack (readiness, job boards, pipeline) |
| `scripts/test-contact-resend.ps1` | Kontakt forma (Resend + CRM) |

## CI (`.github/workflows/ci-monorepo.yml`, „CI (monorepo)”)

| Job | Naziv provere | Koraci |
|-----|---------------|--------|
| `python` | **`Python (Doslednost dok + pytest)`** (required check) | `pwsh scripts/audit-doc-gate-references.ps1` → `pip install -r requirements.txt` → `python -m pytest` |
| `atina-saas` | Atina SaaS (test:ci) | `npm ci` → build → eslint → `scripts/ci-unit-tests.sh` |
| `omnigroup-web` | Omnigroup web (Next.js build) | `npm ci` → `npm run build` |
| `atina-system` | Atina System (verify:ci) | Postgres 15 servis → `npm run verify:ci` |
| `compose` | Compose (docker compose config) | tri `docker compose config --quiet` |

Lokalno ogledalo celog CI-ja je `scripts/verify-monorepo.ps1` (isti red: doc gate + pytest + Atina `test:ci` + `apps/omnigroup-web` build + Nest `verify:ci` + compose; prekidači `-SkipOmnigroupWeb`, `-SkipCompose`, `-SkipNestVerifyCi`, `-SkipDocAudit`). Kad su servisi podignuti dodaj `scripts/smoke-stack.ps1` i `npm run smoke:all`. Branch protection i required check: [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md).

## Doc-gate pravila (jedini hard gate za dokumentaciju)

`scripts/audit-doc-gate-references.ps1` skenira **sve** `.md/.txt/.yml/.yaml/.ps1/.ini` fajlove (osim `node_modules`, `.next`), bez izbacivanja code-fence blokova, i pada ako fajl krši neki od parova:

| Ako fajl pominje | Mora u istom fajlu da sadrži i |
|------------------|--------------------------------|
| `verify-monorepo` | `omnigroup` ili `SkipOmnigroup`, **i** `smoke:all`, **i** tačan string `Python (Doslednost dok + pytest)` |
| `smoke-stack` | `smoke:all` |
| `EVIDENCE-INDEX` (bez obzira na veličinu slova) | `NIVO-1-DRYRUN-LOG` |

Praktično: kad u bilo kom dokumentu pišeš o lokalnom CI ogledalu, napiši jednu rečenicu koja ima sva tri para (kao pasus iznad). Ovaj fajl je sam po sebi primer koji prolazi.

## Lokalni audit dokumentacije (informativno, nije CI)

`scripts/run-all-audits.ps1` pokreće 39 read-only koraka; bez `-FailOn*` prekidača vraća 0 i kad ima WARN. Relevantni za dokumentaciju:

| Skripta | Proverava | Strogi režim |
|---------|-----------|--------------|
| `check-doc-links.ps1` | Relativni linkovi i slike u `*.md` vode do postojećih fajlova | `-FailOnBroken` |
| `check-markdown-code-blocks.ps1` | Zatvoreni code fence-ovi, jezičke oznake | `-FailOnWarn` |
| `check-dev-docs-coverage.ps1` | Svaki `docs/**/*.md`, root `*.md`, `atina-system/docs/**`, `atina-platform/atina/docs/operations/*.md` registrovan u `apps/omnigroup-web/src/app/dev/docs/page.tsx` | `-FailOnMissing` |
| `check-dev-docs-stale-entries.ps1` | Obrnuto: svaka registrovana putanja postoji | `-FailOnStale` |
| `check-readme-presence.ps1` | 7 README fajlova postoje, nisu prazni, imaju tačno jedan H1 | — |
| `check-talas-cross-references.ps1` | Talas N usklađenost među tracking dokumentima | — |

## Konvencije pisanja

- Jezik dokumentacije: srpski latinica; identifikatori alata ostaju engleski (`smoke:all`, nazivi job-ova, putanje).
- Datumi `YYYY-MM-DD`. Brojevi `Val NNN` se ne podižu bez punog postupka iz `scripts/README.md` („Kad podigneš novi broj”).
- Jedan H1 po dokumentu; code fence-ovi uvek sa jezičkom oznakom.
- Novi `docs/**/*.md` → registruj u `/dev/docs` registru u istom PR-u.
- TypeScript: `tsc --noEmit` čist, eslint čist (`npm run lint` u Atini, `next lint` u webu).
- Git: jedan commit po logičkoj promeni; PR mora proći svih pet CI job-ova.

## Tipičan ciklus izmene kataloga isporuka (najčešći zadatak)

1. Dodaj/izmeni stavku u `atina-platform/atina/src/modules/billing/lib/deliverable-catalog.ts` **i** `apps/omnigroup-web/src/lib/deliverable-catalog.ts`.
2. Dodaj acceptance contract (`deliverable-acceptance-contract.ts`) i, ako treba, novi evaluator u `fulfillment-quality-checklist.ts`.
3. Mapiraj id na handler (`deliverable-handlers/*.handler.ts` → `ids`) i implementiraj isporuku.
4. Dopuni testove (registry, checklist, dynamic-pricing) i `$allIds` u e2e skripti.
5. Ako treba na `/services`: `marketing-catalog.ts` (`serviceFromCatalog(id, …)`).
6. `npm run build && npm run lint && npm test` u Atini; `npm run build` u webu.
7. Ažuriraj [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md).

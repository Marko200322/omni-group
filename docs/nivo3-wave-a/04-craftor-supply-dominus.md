# Nivo 3 — Talas A4: Craftor + Supply Core + Dominus360

**Agent:** N3-A4 · **Samo ovaj fajl.**

**Evidencija / šabloni (indeks + dry-run):** [`../EVIDENCE-INDEX.md`](../EVIDENCE-INDEX.md) · [`../NIVO-1-DRYRUN-LOG.md`](../NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../../scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

## PDF fajlovi (`sve/`)

- `Craftor_Full_Implementation_Guide.pdf`
- `Titan_Supply_Core_PRO (1).pdf`
- `dominus360_system_blueprint.pdf`

## Zadatak

1. **Craftor** → `atina-platform/atina/src/modules/craftor/**`.
2. **Supply Core** → `atina-system/src/modules/supply-core/**` (+ Nest: `SupplyCoreModule` u `atina-system/src/app.module.ts`).
3. **Dominus360** → `atina-platform/atina/src/modules/dominus360/**`.
4. Tabela aligned/partial/N/A + dokaz (test fajlovi po imenu).

**Oznake statusa (PDF ↔ repou):** **aligned** = implementacija + imenovani test pokrivaju tok u okviru inženjerskog zatvaranja (ne celokupan stranični PDF audit; vidi [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md)). **partial** = podskup PDF teme, stub/heuristika, ili kod bez dedikovanog testa. **N/A** = nema mape u repou za tu temu.

Inventar PDF redova u `sve/`: [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md) (#11–#13).

## Pregled mapiranja

| PDF | Mapiranje | Status | Napomena |
|-----|-----------|--------|------------|
| Craftor Guide | `atina-platform/atina/src/modules/craftor/craftor.module.ts` (Express `IModule`: kampanje `ecosystem_systems` sa `system_slug = 'craftor'`, run `ecosystem_runs`, audit) | partial | **CEO sekcija D** trag: pun PDF audit = N2+ / tim; u repou su tri moda (`lead-hunt`, `follow-up`, `deal-close`), guard za deal-close, metrike — vidi tematsku tabelu ispod. |
| Supply Core PRO | `atina-system/src/modules/supply-core/**` (`SupplyCoreController` `@Controller('supply')`, `SupplyAgentService`, entiteti `VaultResource`, `SupplyAgentHeartbeat`); uvezano u `atina-system/src/app.module.ts` | partial | Vault status / dodavanje resursa + cron heartbeat tick; nema `supply-core*.spec.ts` u `atina-system/src/**` (dokaz = izvorni fajlovi + eventualni ručni/API test van Jest-a). |
| dominus360 blueprint | `atina-platform/atina/src/modules/dominus360/dominus360.module.ts` (workspace `system_slug = 'dominus360'`, run tipovi `dominus_*`, stage readiness) | partial | Isti nivo zatvaranja kao Craftor; tri moda (`risk-scan`, `resource-allocation`, `forecast`) + blokada naprednih modova na `v1`. |

## Ključni test pathovi (dokaz)

| Modul | Fajl (relativno od `atina-platform/atina/`) | Šta pokriva |
|-------|-----------------------------------------------|-------------|
| Craftor | `src/tests/unit/craftor.module.test.ts` | Inicijalizacija rutera |
| Craftor | `src/tests/unit/craftor.module.routes.test.ts` | GET lista, POST kreiranje, run modovi, 404, validacija `deal-close` / boundary metrike, Zod za `input`, default body |
| Dominus360 | `src/tests/unit/dominus360.module.test.ts` | Inicijalizacija rutera |
| Dominus360 | `src/tests/unit/dominus360.module.routes.test.ts` | GET lista, POST kreiranje (default `stage`), forecast / risk-scan / resource-allocation, blokada `forecast` na `v1`, `resource-allocation` na `v1` vs `risk-scan` OK, validacija `input`, 404, default body |
| Supply Core (atina-system) | N/A u Jest suite za ovaj modul | Nema odgovarajućeg `*.spec.ts` uz `supply-core` u `atina-system/src/` (pored postojećih `auth.*.spec`, `app.controller.spec.ts`). |

## `Craftor_Full_Implementation_Guide.pdf` → craftor

| Tema (očekivani opseg vodiča) | Kod | Status | Test / dokaz |
|-------------------------------|-----|--------|----------------|
| Registracija modula / rute | `craftor.module.ts` | aligned | `craftor.module.test.ts`, `craftor.module.routes.test.ts` |
| Kampanje (list / create) nad `ecosystem_systems` | `craftor.module.ts` GET `/`, POST `/` | aligned | `craftor.module.routes.test.ts` (GET lista, POST sa default `lead_target`) |
| Operativni ciklusi / modovi rada | POST `/:id/run` — `lead-hunt`, `follow-up`, `deal-close` | aligned | `craftor.module.routes.test.ts` |
| Readiness / pravila prelaska (npr. deal-close) | `nonNegativeLeadCount`, validacija ≥10 leadova | aligned | `craftor.module.routes.test.ts` (blokada, granica 10, string koercija) |
| Audit trag događaja | `audit_events` inserti | partial | Pokriveno indirektno kroz `mockQuery` redosled u route testovima, bez assert-a na audit SQL |
| Pun produkcioni obim vodiča (integracije van ecosystem tabele, celokupan PDF) | van ovog fajla | N/A | Van N3-A4 opsega; **N2+** PDF trag (**CEO sekcija D** / **F** po opsegu; vidi [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../NIVO-2-CEO-PDF-RULES-CLOSURE.md)) |

## `Titan_Supply_Core_PRO (1).pdf` → atina-system supply-core

| Tema (Supply / TSC) | Kod | Status | Test / dokaz |
|---------------------|-----|--------|----------------|
| Nest modul i DI | `supply-core.module.ts`, import u `app.module.ts` | aligned | Struktura repoa; nema dedicated spec |
| REST: stanje vault-a | `GET supply/vault/status` → `SupplyAgentService.status()` | partial | N/A (Jest) |
| REST: unos resursa | `POST supply/vault/resource` → `addResource` | partial | N/A (Jest) |
| Agent tick / heartbeat | `@Cron` `tick()`, `SupplyAgentHeartbeat` | partial | N/A (Jest); logika u `supply-agent.service.ts` |
| Vault entitet / perzistencija | `vault-resource.entity.ts`, TypeORM u modulu | partial | N/A (Jest) |
| Faza sistema (vezivanje na Phase) | `PhaseService` u `SupplyAgentService` | partial | N/A (Jest) |

## `dominus360_system_blueprint.pdf` → dominus360

| Tema (blueprint / 360) | Kod | Status | Test / dokaz |
|------------------------|-----|--------|----------------|
| Workspace CRUD nad `ecosystem_systems` | `dominus360.module.ts` GET `/`, POST `/` | aligned | `dominus360.module.routes.test.ts` |
| Run tipovi i payload | POST `/:id/run` — `risk-scan`, `resource-allocation`, `forecast` | aligned | `dominus360.module.routes.test.ts` |
| Stage / readiness (v1 vs v2) | validacija modova u odnosu na `system.stage` | aligned | `dominus360.module.routes.test.ts` (forecast blokiran na v1; resource-allocation vs risk-scan na v1) |
| Metrike / prognoze (JSON polja) | `metrics` updates u run handleru | partial | Delimično kroz očekivane `output_payload` u testu |
| Celokupan blueprint van ecosystem slice-a | — | N/A | **N2+** PDF audit (**CEO sekcija D**; vidi [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../NIVO-2-CEO-PDF-RULES-CLOSURE.md)) |

## Reference

- [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

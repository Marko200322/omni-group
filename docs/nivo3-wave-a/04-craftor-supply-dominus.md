# Nivo 3 — Talas A4: Craftor + Supply Core + Dominus360

**Agent:** N3-A4 · **Samo ovaj fajl.**

**Poslednje usklađivanje:** 2026-05-21 (integracije Master Blueprint 2026-05-20 + Nest `supply-core*.spec.ts` + `npm run verify:n1` **140/140**).

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
| Craftor Guide | `atina-platform/atina/src/modules/craftor/**` (C-S-R: `controller/`, `service/`, `repository/`, `dto/`; `getAiClient()` za humanizaciju / preporuke u run toku) | **partial** → jači inženjerski trag | Rute + AI agregator (mock u `craftor-ai.service.test.ts`); pun PDF = N2+. |
| Supply Core PRO | `atina-system/src/modules/supply-core/**` | **aligned** (inženjerski) | REST vault + `@Cron` `tick()` + Jest specovi ispod; PDF PRO širina van Jest-a = partial na nivou CEO PDF-a. |
| dominus360 blueprint | `atina-platform/atina/src/modules/dominus360/**` (C-S-R + `getAiClient()` u servisu) | **partial** → jači trag | Tri moda + stage guard; AI put mock-ovan kroz servis, ne kroz ceo blueprint PDF. |

## Ključni test pathovi (dokaz)

| Modul | Fajl (relativno od `atina-platform/atina/`) | Šta pokriva |
|-------|-----------------------------------------------|-------------|
| Craftor | `src/tests/unit/craftor.module.test.ts` | Inicijalizacija rutera |
| Craftor | `src/tests/unit/craftor.module.routes.test.ts` | GET lista, POST kreiranje, run modovi, 404, validacija `deal-close` / boundary metrike, Zod za `input`, default body |
| Craftor AI | `src/tests/unit/craftor-ai.service.test.ts` | `CraftorService` + mock `getAiClient()` (humanizacija / preporuke bez pravog ključa) |
| Dominus360 | `src/tests/unit/dominus360.module.test.ts` | Inicijalizacija rutera |
| Dominus360 | `src/tests/unit/dominus360.module.routes.test.ts` | GET lista, POST kreiranje (default `stage`), forecast / risk-scan / resource-allocation, blokada `forecast` na `v1`, `resource-allocation` na `v1` vs `risk-scan` OK, validacija `input`, 404, default body |
| Supply Core (atina-system) | `atina-system/src/modules/supply-core/supply-core.controller.spec.ts` | REST `GET supply/vault/status`, `POST supply/vault/resource` |
| Supply Core (atina-system) | `atina-system/src/modules/supply-core/supply-agent.service.spec.ts` | `status()`, `addResource()`, **`tick()` heartbeat** (phase + vault count) |
| Supply Core (atina-system) | `atina-system/src/modules/supply-core/dto/add-vault-resource.dto.spec.ts` | DTO validacija |

## `Craftor_Full_Implementation_Guide.pdf` → craftor

| Tema (očekivani opseg vodiča) | Kod | Status | Test / dokaz |
|-------------------------------|-----|--------|----------------|
| Registracija modula / rute | `craftor.module.ts` | aligned | `craftor.module.test.ts`, `craftor.module.routes.test.ts` |
| Kampanje (list / create) nad `ecosystem_systems` | `craftor.module.ts` GET `/`, POST `/` | aligned | `craftor.module.routes.test.ts` (GET lista, POST sa default `lead_target`) |
| Operativni ciklusi / modovi rada | POST `/:id/run` — `lead-hunt`, `follow-up`, `deal-close` | aligned | `craftor.module.routes.test.ts` |
| Readiness / pravila prelaska (npr. deal-close) | `nonNegativeLeadCount`, validacija ≥10 leadova | aligned | `craftor.module.routes.test.ts` (blokada, granica 10, string koercija) |
| Audit trag događaja | `audit_events` inserti | partial | Pokriveno indirektno kroz `mockQuery` redosled u route testovima, bez assert-a na audit SQL |
| AI agregator (`AI_URL` / `AI_KEY`) u run toku | `craftor.service.ts` → `getAiClient()` | **aligned** (mock) | `craftor-ai.service.test.ts` |
| Pun produkcioni obim vodiča (integracije van ecosystem tabele, celokupan PDF) | van ovog fajla | N/A | Van N3-A4 opsega; **N2+** PDF trag (**CEO sekcija D** / **F** po opsegu; vidi [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../NIVO-2-CEO-PDF-RULES-CLOSURE.md)) |

## `Titan_Supply_Core_PRO (1).pdf` → atina-system supply-core

| Tema (Supply / TSC) | Kod | Status | Test / dokaz |
|---------------------|-----|--------|----------------|
| Nest modul i DI | `supply-core.module.ts`, import u `app.module.ts` | **aligned** | `supply-core.controller.spec.ts` |
| REST: stanje vault-a | `GET supply/vault/status` → `SupplyAgentService.status()` | **aligned** | `supply-core.controller.spec.ts`, `supply-agent.service.spec.ts` (`status`) |
| REST: unos resursa | `POST supply/vault/resource` → `addResource` | **aligned** | controller + service spec + `add-vault-resource.dto.spec.ts` |
| Agent tick / heartbeat | `@Cron` `tick()`, `SupplyAgentHeartbeat` | **aligned** | `supply-agent.service.spec.ts` (`tick` + phase) |
| Vault entitet / perzistencija | `vault-resource.entity.ts`, TypeORM u modulu | partial | Indirektno kroz mock repoa u spec-ovima |
| Faza sistema (vezivanje na Phase) | `PhaseService` u `SupplyAgentService` | **aligned** | `tick` test sa `getPhase()` |

## `dominus360_system_blueprint.pdf` → dominus360

| Tema (blueprint / 360) | Kod | Status | Test / dokaz |
|------------------------|-----|--------|----------------|
| Workspace CRUD nad `ecosystem_systems` | `dominus360.module.ts` GET `/`, POST `/` | aligned | `dominus360.module.routes.test.ts` |
| Run tipovi i payload | POST `/:id/run` — `risk-scan`, `resource-allocation`, `forecast` | aligned | `dominus360.module.routes.test.ts` |
| Stage / readiness (v1 vs v2) | validacija modova u odnosu na `system.stage` | aligned | `dominus360.module.routes.test.ts` (forecast blokiran na v1; resource-allocation vs risk-scan na v1) |
| Metrike / prognoze (JSON polja) | `metrics` updates u run handleru | partial | Delimično kroz očekivane `output_payload` u testu |
| AI agregator u analitičkom run-u | `dominus360.service.ts` → `getAiClient()` | partial | Servis koristi AI; nema posebnog `dominus360-ai.service.test.ts` (za razliku od Craftor) |
| Celokupan blueprint van ecosystem slice-a | — | N/A | **N2+** PDF audit (**CEO sekcija D**; vidi [`NIVO-2-CEO-PDF-RULES-CLOSURE.md`](../NIVO-2-CEO-PDF-RULES-CLOSURE.md)) |

## OmniTube / OmniGame / Apex (checklista §8.2)

Detaljna matrica PDF ↔ repo: [`05-omnitube-apex.md`](./05-omnitube-apex.md). Sažetak posle integracija **2026-05-20**:

| Modul | Repo put | Status (2026-05-21) | Test / integracija |
|-------|----------|----------------------|-------------------|
| **OmniTube** | `src/modules/omnitube/**` | **partial** (PDF i dalje N2+) | Rute + `omnitube-ai` put: `omnitube.service.ts` → `getAiClient()`; `omnitube-ai.service.test.ts`, `omnitube.*.test.ts` |
| **OmniGame** | `src/modules/omnigame/**` | **partial** | `omnigame.*.test.ts`; `validate` mod → `executeOmnigameValidate` / scraper task (bez direktnog `getAiClient` u servisu) |
| **Apex Predator** | `src/modules/apex-predator/**` | **partial** + **N/A** (narativ PDF) | `modules/apex-predator/*.test.ts`; `apex-predator.service.ts` → `getAiClient()` za run obogaćivanje |

**Pravilo:** **aligned** samo za tokove pokrivene imenovanim testovima; ceo PDF ostaje **partial** dok tim ne uradi stranični audit.

## Reference

- [`NIVO-2-CEO-D-TRACE.md`](../NIVO-2-CEO-D-TRACE.md)
- [`NIVO-3-SVE-INVENTORY.md`](../NIVO-3-SVE-INVENTORY.md)
- Pun monorepo gate (isti red kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`../GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`../NIVO-1-F4-TIM-CHECKLIST.md`](../NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`../NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)

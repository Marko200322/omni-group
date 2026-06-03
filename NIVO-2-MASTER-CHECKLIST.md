# Nivo 2 — N2 master lista (Master Spec inženjerski)

**Cilj:** zatvoriti inženjerski **Nivo 2** = **Nivo 1** (zatvoren **F.4** + **F.5** po pravilima tima — vidi [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md)) + **CEO sekcije D i E** u [`CHECKLIST-CEO-SISTEM.md`](./CHECKLIST-CEO-SISTEM.md) (**CEO sekcija D:** 50 modula — smislen test/coverage ili dokumentovan izuzetak; **CEO sekcija E** gde je u opsegu) + priprema za **E2E simulaciju** (**CEO sekcija D** — lead → payment) po dogovoru.

**Status (repou, 2026):** inženjerski gate-ovi ispod su **`[x]`** uz [`NIVO-2-CEO-D-TRACE.md`](./docs/NIVO-2-CEO-D-TRACE.md) i [`atina-platform/atina/docs/operations/NIVO-2-E2E.md`](./atina-platform/atina/docs/operations/NIVO-2-E2E.md). **P.1 `[x]`** (F.4): zatvoren **lokalno** punim mirrorom — [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**LATEST verify Val 355** / **2026-05-14** sa D.1 placeholder Iter 2 — [`docs/D1-ITER2-PR-BODY.md`](./docs/D1-ITER2-PR-BODY.md); ranije **Val 354** / **2026-05-13** sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` — [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md); **Val 349** / **2026-05-08**) · [`NIVO-1-MASTER-CHECKLIST.md`](./NIVO-1-MASTER-CHECKLIST.md) red **F.4**; ako koristiš GitHub, i dalje možeš zalepiti URL zelenog **CI (monorepo)** na `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)). Isti red lokalno: [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); opcije **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno; **Port mismatch** — [`scripts/README.md`](./scripts/README.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) — [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md); **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08). **0.3** (CI na svakom merge-u na `main`) važi kad postoji GitHub; bez njega oslanjaj se na lokalni gate — red **0.3** u tabeli ispod. **Runbook (Actions, sva 5 job-ova, kad je crveno):** [`docs/CI-GREEN-ON-MAIN.md`](./docs/CI-GREEN-ON-MAIN.md).

**Pravila:** kao Nivo 1 — max **3–4** paralelna agenta, **disjunktni** `src/modules/<folder>` granice; merge redosled vidi [`AGENT-RADNI-PLAN.md`](./AGENT-RADNI-PLAN.md).

*Lokalni mirror **CI (monorepo)** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md) → pytest → Atina `test:ci` → `apps/omnigroup-web` build → Nest `verify:ci` / `verify:n1` + tri `docker compose config`):* [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · [`scripts/README.md`](./scripts/README.md) (**Get-Help**, **`-SkipOmnigroupWeb`** / **`-SkipCompose`** / **`-SkipNestVerifyCi`** / **`-SkipDocAudit`**, **Port mismatch** Nest/pg) · **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 — D.1 Iter 2; ranije **Val 354** / 2026-05-13) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Bundled Atina HTTP (kad je API gore):** `atina-platform/atina` → **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **`smoke-stack.ps1`** za Atina Node šalje samo **`GET /health`** kada je stub uključen.

**Evidencija / šabloni (indeks + dry-run):** [`docs/EVIDENCE-INDEX.md`](./docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](./docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](./scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** uz `npm run dev` u `apps/omnigroup-web`, ruta **`/dev/docs`**; detalji — [`apps/omnigroup-web/README.md`](apps/omnigroup-web/README.md).

---

## Preduslovi (Nivo 1 gate)

| # | Zadatak | Gate |
|---|---------|------|
| P.1 | **F.4** — vidi [`NIVO-1-MASTER-CHECKLIST`](./NIVO-1-MASTER-CHECKLIST.md) / [`NIVO-1-F4-TIM-CHECKLIST.md`](./docs/NIVO-1-F4-TIM-CHECKLIST.md): Actions na `main` (job **`python`**: **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) **ili** lokalni [`verify-monorepo.ps1`](./scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](./scripts/README.md); pun red uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** — [`scripts/README.md`](./scripts/README.md)) po dogovoru · opciono [`smoke-stack.ps1`](./scripts/smoke-stack.ps1) (multi-stack HTTP; Atina Node = **GET** `/health`) · **`npm run smoke:all`** — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](./atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*) · **LATEST verify:** [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 349** / 2026-05-08) · **LATEST smoke** (**sekcija H**): [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 348** / 2026-05-08) | [x] — **2026-05-08:** lokalni dokaz **Val 349** (`NIVO-1-MASTER` **F.4**); Actions = opciono |
| P.2 | **F.5** — **CEO sekcije A, B, C, G i H** za Nivo 1 usklađene timom (uz **LATEST smoke** (**sekcija H**) kao tri-stub dokaz za **CEO sekciju H**) | [x] |

---

## CI na `main` (opciono, ako GitHub)

| # | Zadatak | Gate |
|---|---------|------|
| 0.3 | CI monorepo (job **`python`**: **`Python (Doslednost dok + pytest)`** na GitHubu — [`docs/GIT-BRANCH-PROTECTION.md`](./docs/GIT-BRANCH-PROTECTION.md)) i dalje zelen na svakom merge-u na `main` · ljudi: [`docs/CI-GREEN-ON-MAIN.md`](./docs/CI-GREEN-ON-MAIN.md) | [x] — **2026-06-03:** Run [#77](https://github.com/Marko200322/omni-group/actions/runs/26912274234) (`7eabd71`) 5/5 PASS; [`docs/N2-0-3-EVIDENCE-LATEST.md`](./docs/N2-0-3-EVIDENCE-LATEST.md) |

*Discovery audit (bivši 0.1 / 0.2):* [`docs/NIVO-2-DISCOVERY-AUDIT.md`](./docs/NIVO-2-DISCOVERY-AUDIT.md) — zatvoreno **2026-05-02**.

---

## Talas 1 — Agent 5 (orchestracija / Forge)

**Granica:** `atina-platform/atina/src/modules/workflow-chain/**`, `forge/**`, `automation/**` — bez drugih modula u istom PR-u.

| # | Zadatak | Gate |
|---|---------|------|
| T1.1 | Po modulu: unit ili integration testovi gde nedostaju; `npm run test:ci` zeleno | [x] |
| T1.2 | Coverage pragovi ili opravdani izuzetak u PR opisu | [x] |

---

## Talas 2 — Agent 6 (blokovi 5–8 modula)

**Granica:** grupe foldera iz **CEO sekcije D** (redovi 7–22) po dogovoru iz discovery audita (npr. CRM, billing, payments…).

**Paralelno (više agenata / Cursor Task):** do **3–4** disjunktna modula odjednom; ne dirati isti `src/modules/<folder>` u dva PR-a bez dogovora. **2026-05-02:** paralelni Task agenti na `follow-up` / `follow-up-automation`, `digital-signature`, `contracts`; lokalno `package-pricing.stub.test.ts`. **2026-05-02 (nastavak):** `phase-launch.controller`, `client-hunter.controller`, `lead-scoring.controller` unit testovi.

| # | Zadatak | Gate |
|---|---------|------|
| T2.1 | Prva grupa modula — testovi + CI zeleno | [x] |
| T2.2 | Druga grupa (iteracija) | [x] |

---

## Talas 3 — Agent 7 (preostali moduli + E)

| # | Zadatak | Gate |
|---|---------|------|
| T3.1 | Preostali redovi **D** + stavke **E** u opsegu | [x] |

---

## E2E i integracija — Agent 8

| # | Zadatak | Gate |
|---|---------|------|
| E2E.1 | Jedna automatska simulacija (Supertest/Playwright) kroz kritičan tok — staging base URL iz env/CI, **bez** tajni u gitu | [x] |
| E2E.2 | Dokumentacija koraka u `docs/operations/` ili platform README | [x] |
| E2E.3 | Pun **CoreEngine** integracioni test: `/health`, `/api/v1` moduli, GET po slug-u bez 5xx — `core-engine.full-stack.integration.test.ts` | [x] |

---

## Izlaz Nivoa 2 (Definition of Done)

| # | Zadatak | Gate |
|---|---------|------|
| X.1 | **CEO sekcija D:** za svaki red — **[x]** test/coverage/(T) ili **eksplicitni N/A** u audit dokumentu | [x] |
| X.2 | **CEO sekcija E** u dogovorenom opsegu | [x] |
| X.3 | E2E.1 zatvoren ili dokumentovan „van opsega“ odlukom tima | [x] |

---

*Verzija: Nivo 2 master v0.1. Ažuriraj `[ ]` u PR-ovima po talasu; ne širi PR van granice agenta.*

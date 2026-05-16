# Nivo 2 — zatvaranje **CEO sekcije D** „PDF pravila“ (inženjerski minimum u repou)

Ovaj dokument zamenjuje ručno „potpis po PDF stranicama“: daje **proverljive** reference u repou za tri stavke ispod Master Spec tabele **u CEO sekciji D** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## 1. Stroga modularna izolacija (bez skrivenih cross-importova)

**U repou:**

- Granice agenata / merge redosled: [`CONTRIBUTING.md`](../CONTRIBUTING.md) — disjunktni `src/modules/<slug>/`.
- Registracija modula: `atina-platform/atina/src/core/ModuleRegistry.ts` + testovi `src/tests/unit/core-engine.test.ts`, `ModuleRegistry.test.ts`.
- CI: `npm run test:ci` (build + lint + unit) — ne prolazi ako TypeScript import graf puca.
- Pun **CI (monorepo)** iz korena (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + tri `docker compose config`; opciono **`-SkipOmnigroupWeb`** / **`-SkipNestVerifyCi`** / **`-SkipCompose`** / **`-SkipDocAudit`** lokalno): [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**N2+ (van repoa):** formalni audit „nema skrivenih cross-importova“ prema celom PDF-u — poseban PR / alat (npr. dependency-cruiser) ako tim zahteva.

---

## 2. Migracije + rollback plan pre produkcije

**U repou:**

- [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) — koraci deploy / rollback.
- [`atina-platform/atina/docs/operations/production-config-matrix.md`](../atina-platform/atina/docs/operations/production-config-matrix.md) — env i tajne politika.
- Nest: migracioni plan u `atina-system/README.md` i `atina-system/docs/` (TYPEORM_SYNC, migracije).

**N2+:** izvršen staging/prod dry-run sa stvarnim URL i timskim potpisom.

---

## 3. Okruženja dev / test / prod (secrets, URL, DB)

**U repou:**

- Matrica env varijabli: `production-config-matrix.md` (gore).
- Primeri bez tajni u gitu: `.env.example` u `atina-platform/atina`, `atina-system`, root compose README / `NIVO-1-START.md`.
- Monorepo CI: isti red lokalno — [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (pet jobova uklj. **`python`** (required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest` i **`omnigroup-web`**; **Get-Help** za **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno; **Port mismatch** Nest/pg) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14); na GitHubu — [`.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml) (test okruženje odvojeno od prod secret-a u Actions).

**N2+:** živi secret manager, odvojeni DB klasteri — operativno van ovog fajla.

---

*Namena: zatvaranje stavki u **CEO sekciji D** za Nivo 2 u **inženjerskom** smislu; pun sign-off za **CEO sekciju D** i PDF i dalje na timu.*

# Nivo 3 — inventar `sve/` (PDF)

**Datum:** 2026-05-02 · **Repo:** `omni group` root `sve/`

| # | Fajl |
|---|------|
| 1 | `Titan_System_Modules_Master_Spec_v2.pdf` |
| 2 | `Titan_System_Modules_Final.pdf` |
| 3 | `titan_system_modules.pdf` |
| 4 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus.pdf` |
| 5 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021.pdf` |
| 6 | `Titan_System_Ultimate_Node_Blueprint_v1_to_v6_plus_260330_004021 (1).pdf` |
| 7 | `TitanOmniGroup_ULTRA_Blueprint.pdf` |
| 8 | `TITAN_MASTER_TITANIX_BLUEPRINT.pdf` |
| 9 | `Titan_Astra_Full_Production.pdf` |
| 10 | `Titan_Astra_Full_Production-1 (1).pdf` |
| 11 | `Craftor_Full_Implementation_Guide.pdf` |
| 12 | `Titan_Supply_Core_PRO (1).pdf` |
| 13 | `dominus360_system_blueprint.pdf` |
| 14 | `OmniTube_Project_Overview.pdf` |
| 15 | `apex_predator_text.pdf` |

**Napomena:** duple varijante (npr. dva Astra, tri Ultimate Blueprint) tretirati u matrici kao jedan „CEO red“ sa podlistom fajlova.

**Sledeći korak (mapiranje PDF → repo):** [`NIVO-3-PDF-TRACE.md`](./NIVO-3-PDF-TRACE.md). **Monorepo gate (F.4; P.N2.2 `[x]` lokalno Val 354 u [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md)):** pet jobova u **CI (monorepo)** (job **`python`** = **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + `pytest`; GitHub prikaz: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); `atina-saas`, **`omnigroup-web`**, `atina-system`, `compose`) ili isti red lokalno — [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); opciono **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** lokalno; **Port mismatch** Nest/pg) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`../scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

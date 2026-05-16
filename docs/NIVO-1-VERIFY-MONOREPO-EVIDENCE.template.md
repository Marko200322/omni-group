# NIVO-1 — verify-monorepo evidence (template; job **`python`** / [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md))

Copy this file or duplicate and **remove `.template` from the filename** when you keep a permanent record. Fill **after** a run of [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) from the **repo root**. Runbook: [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md). **LATEST verify** (popunjen primer, pun red, uklj. **`apps/omnigroup-web`**): [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)). **LATEST smoke** (**sekcija H**) (posle `smoke-stack.ps1`; Atina Node deo = **`GET /health`**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **Bundled Atina HTTP** (odvojeno od [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)), kad je API gore): **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Red:** prvi korak u [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)): `audit-doc-gate-references.ps1` (pravila: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`** gde se indeks citira, u [`scripts/README.md`](../scripts/README.md)); zatim ostatak reda. Uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; **Port mismatch** (Nest/pg) — [`scripts/README.md`](../scripts/README.md) i polje *Postgres* ispod.

*Ako u **Overall** / **Per step** / napomenama pominješ HTTP smoke iz korena ([`smoke-stack.ps1`](../scripts/smoke-stack.ps1)), dodaj i da li si radio bundled **`npm run smoke:all`** (**`smoke:all`**) u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*); šablon sekcija H: [`NIVO-1-SMOKE-EVIDENCE.template.md`](../atina-platform/atina/docs/operations/NIVO-1-SMOKE-EVIDENCE.template.md).*

## Run metadata

- **Date (local):** <!-- YYYY-MM-DD, optional time -->
- **Host / OS (optional):**
- **Branch / commit (optional):**
- **Postgres (only if Nest ran full `verify:ci`):** host port and **`POSTGRES_PORT`** (and related **`POSTGRES_*`**) must match the published DB port — vidi **Port mismatch** u [`scripts/README.md`](../scripts/README.md).

## Command

**Paritet CI:** [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) — job **`python`**, **`Python (Doslednost dok + pytest)`**.

<!-- Paste exact invocation, e.g.
     .\scripts\verify-monorepo.ps1   # GIT-BRANCH-PROTECTION.md
     .\scripts\verify-monorepo.ps1 -SkipCompose   # GIT-BRANCH-PROTECTION.md
     .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi   # GIT-BRANCH-PROTECTION.md
     .\scripts\verify-monorepo.ps1 -SkipCompose -SkipNestVerifyCi   # GIT-BRANCH-PROTECTION.md
     .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb   # GIT-BRANCH-PROTECTION.md
     .\scripts\verify-monorepo.ps1 -SkipDocAudit   # GIT-BRANCH-PROTECTION.md
-->

```powershell
```

- **Flags used:** <!-- none / `-SkipOmnigroupWeb` / `-SkipCompose` / `-SkipNestVerifyCi` / `-SkipDocAudit` / combinations -->

## Overall

- **Result:** <!-- PASS | FAIL -->

## Per step (PASS / FAIL / SKIPPED)

Use **SKIPPED** when the script did not run that gate (e.g. `-SkipOmnigroupWeb`, `-SkipCompose`, `-SkipNestVerifyCi`, or `-SkipDocAudit`). Nest is either full **`verify:ci`** or lighter **`verify:n1`** — note which one ran.

| Step | Result | Notes |
|------|--------|--------|
| `audit-doc-gate-references.ps1` (**Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) | PASS / FAIL / SKIPPED | SKIPPED if `-SkipDocAudit`. Ako FAIL: pravila **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) · troubleshooting [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md). |
| `pytest` (repo root) | PASS / FAIL / SKIPPED | |
| `npm run test:ci` in `atina-platform/atina` | PASS / FAIL / SKIPPED | |
| `npm ci` + `npm run build` in `apps/omnigroup-web` | PASS / FAIL / SKIPPED | |
| `atina-system`: `npm run verify:ci` **or** `npm run verify:n1` | PASS / FAIL / SKIPPED | <!-- which command ran --> |
| `docker compose config --quiet` (three files, CI `compose` mirror) | PASS / FAIL / SKIPPED | |

## Optional: pasted output tail

<!-- Last lines of the terminal (e.g. success banner or first error). -->

```text
```

## If FAIL — first failing step / error (optional)

<!-- Step name + short excerpt or log pointer. -->

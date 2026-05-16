# Digital Signature module — wiring gate

Canonical copy for PRs: `src/modules/digital-signature/WIRING.md`.

**Slug:** `digital-signature`. **Stub modes:** `request` | `remind` | `verify`.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## Code

- [x] `DigitalSignatureModule` on `moduleRegistry` in app bootstrap (see `CoreEngine.registerModules()`).
- [x] Phase gate: `digital-signature` → `v1` in `phase-activation.middleware.ts` (`MODULE_MIN_PHASE`).
- [x] Seed row for `modules` table in `001_seed_data.ts` (name, slug, description, `required_plan: pro`).
- [x] Pro plan `limits.modules` includes `digital-signature`.

## API

- Base path: `/api/v1/digital-signature` (mounted via `moduleRegistry.mountRoutes()`).
- `GET /` — list current user’s `ecosystem_systems` with `system_slug = 'digital-signature'`.
- `POST /` — create workspace (body: `name`, optional `budgetAllocated`).
- `POST /:id/run` — stub cycle (body: `mode`: `request` | `remind` | `verify`, optional `input`).

## Data

- Uses `ecosystem_systems` and `ecosystem_runs` (migration `002_ecosystem_systems.sql`).
- Run types: `digital_signature_<mode>` (e.g. `digital_signature_verify`).

## Follow-ups (not in minimal stub)

- [ ] Integrate a real e-sign provider (webhooks, signer identity).
- [ ] Add workflow-chain template steps if cross-module orchestration is required.
- [ ] Frontend workspace UI and API client types.

## See also (parent monorepo)

Pre širih PR-ova koji diraju više stackova: iz korena `omni group` pokreni [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (isti red kao CI — job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + ostalo, uklj. **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest/pg v. README) · opciono [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP; Atina Node stub = GET `/health`). **Bundled Atina:** **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](./release-gate-checklist.md) (*Local notes — Smoke tests*). Detalji i **Get-Help:** [`scripts/README.md`](../../../../scripts/README.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). Timski gate **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

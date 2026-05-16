# Release Sign-Off Template

Use this template for each production release. Store the completed record in the release notes system and ensure every mandatory gate has linked evidence.

*Optional:* For structured NIVO-1 smoke evidence, you can use [`NIVO-1-SMOKE-EVIDENCE.template.md`](./NIVO-1-SMOKE-EVIDENCE.template.md).

*Monorepo parent (`omni group`):* optional full-stack mirror of **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** on GitHub — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) — [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md) → pytest → Atina `test:ci` → **`apps/omnigroup-web`** build → Nest `verify:ci` + ×3 `docker compose config`; optional **`-SkipOmnigroupWeb`** / **`-SkipDocAudit`** locally) · [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../../../scripts/README.md) (**Port mismatch** za Nest/pg) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## Release Metadata

- Release name/version:
- Date (UTC):
- Environment:
- Commit SHA:
- Artifact/build ID:
- Change window:
- Release type (standard/hotfix/emergency):
- Incident or ticket reference(s):

## Ownership and Accountability

- Release Manager:
- Dev Owner:
- QA Lead:
- On-call Engineer:
- Rollback Owner:
- Product/Business Approver:

| Responsibility | Primary | Backup |
|---|---|---|
| Release coordination |  |  |
| Quality gate verification |  |  |
| Deployment execution |  |  |
| Production verification |  |  |
| Rollback execution |  |  |

## Gate Status and Evidence

| Gate | Status (PASS/FAIL/N/A) | Owner | Evidence Link(s) | Verified At (UTC) | SHA/Build Verified | Notes |
|---|---|---|---|---|---|---|
| Lint |  |  |  |  |  |  |
| Unit tests |  |  |  |  |  |  |
| Integration tests |  |  |  |  |  |  |
| Smoke tests |  |  |  |  |  |  |
| Post-deploy verification |  |  |  |  |  |  |

## Go / No-Go Decision Record

- Decision: GO / CONDITIONAL GO / NO-GO
- Decision time (UTC):
- Decision owner (Release Manager):
- Required approvers present (names/roles):
- Decision rationale (concise):
- Risks accepted (if any, include owner + expiry date):
- Required follow-ups (action, owner, due date):
- Rollback trigger thresholds reconfirmed: Yes / No

## Sign-Off

By signing below, approvers confirm that required gates are reviewed, ownership is assigned, and evidence is complete.

| Role | Name | Sign-Off (Initials/Name) | Time (UTC) |
|---|---|---|---|
| Release Manager |  |  |  |
| Dev Owner |  |  |  |
| QA Lead |  |  |  |
| On-call Engineer |  |  |  |
| Product/Business Approver |  |  |  |

## Rollback Readiness Confirmation

- Rollback owner available: Yes / No
- Rollback plan validated: Yes / No
- Snapshot/backup reference:
- Trigger thresholds confirmed: Yes / No
- Estimated rollback execution time:

## CEO sekcija G rollback — evidence template (prod)

Use after any **production** rollback to close the **CEO sekcija G** rollback red u [`CHECKLIST-CEO-SISTEM.md`](../../../../CHECKLIST-CEO-SISTEM.md). Keep the corresponding matrix row **`[ ]`** until all items below are filled with real prod evidence.

**Evidence template**

- **Date** (UTC when rollback completed):
- **Version / git SHA** (restored stable artifact or image tag and full commit SHA):
- **Who approved rollback** (name and role; authority per change/incident record):
- **Link to smoke evidence** (Critical smokes after rollback — see [`deploy-rollback-checklist.md`](./deploy-rollback-checklist.md) odjeljak 8.C):

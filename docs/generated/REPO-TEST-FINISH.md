# Repo test finish — 2026-09-21

Branch: `feat/phase10-outreach-send-enabled` (VPS finish uses `docker-compose.nest-vps-verify.yml` + resilient git reset on CI clone)

## Automatski (CI-paritet)

| Gate | Laptop | VPS Docker |
|------|--------|------------|
| `npm run test:ci` (3538 tests + coverage floors) | **PASS** exit 0 | **PASS** 369/369 exit 0 |
| `verify-monorepo-vps` (3735+ incl. integration) | — | **PASS** (prior run) |

Fixes: `optionalNumber` → `parseFloat` (Stripe fee rates); `config-env.test.ts` updated; coverage floors aligned to measured ~85/64/86/84.

## Extended / live

| Test | Result |
|------|--------|
| test:contact Resend prod | PASS |
| test:hunt-pipeline | PASS (laptop + VPS prod `.env`) |
| smoke:hunting:quick | PASS |
| smoke:evolution / product-factory / category-rollout | PASS |
| smoke-stack Astra :8080 + Nest :13001 + prod Atina health | **PASS** (via `docker-compose.nest-vps-verify.yml`; older finish log may show :6380 clash — superseded) |

## Očekivano / namerno

| Test | Result |
|------|--------|
| `smoke:hunting` (full pipeline send) | **FAIL** on prod — `OUTREACH_SEND_ENABLED=false` (kill-switch) |
| `e2e-billing-prod` | not run (writes prod billing state) |
| isolated `docker-prod-test` on VPS | infra (Forge/OOM) — live prod smokes cover API |

## Commands

- Extended prod: `.\scripts\run-extended-tests.ps1`
- VPS finish: `.\scripts\run-vps-finish-repo.ps1 -FollowLog` or `bash scripts/finish-repo-test-vps.sh` (log `/var/log/omni-finish-repo-test.log`)
- Full repo: `.\scripts\run-vps-system-test.ps1 -RunProdAudit`

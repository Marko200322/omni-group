# Go live — prod sales checklist

**Catalog:** 50 industry categories × **20** product sets (17 SKU + 3 bundles).  
**Fast verify (no checkout):** `.\scripts\verify-industry-package-matrix-prod.ps1`  
**Fulfillment proof:** `.\scripts\e2e-fulfillment-matrix-prod.ps1 -Resume` (1000 cells — run hours; use `-SkipSlow` to shorten).  
**One-shot:** `.\scripts\run-go-live-today.ps1`

**Sell today:** `/pricing` → industry → checkout (manual confirm on prod).  
**Outbound:** `outreachSendEnabled: true` + `outreachDomainWarmupComplete: true` in `deploy.config.json` → redeploy (`SafeDeploy`) syncs `OUTREACH_SEND_ENABLED` on API.

**2026-09-22 prod:** Deploy OK · audit 13 PASS / 0 FAIL · 50×20 matrix PASS · founding promo ON · Resend kontakt OK · finish-repo smoke PASS (test:ci exit 1 — see VPS log).

**M6 bump:** `.\scripts\m6-prod-rollout.ps1` (sets `factoryPhase=M6`, full profile, deploy, matrix verify).  
**Repo scale verify on VPS:** `.\scripts\run-vps-finish-repo.ps1 -UseProdDeployPath` (test:ci + hunt + smoke on `/opt/omni-group`).

**Matrix KANON:** `fulfillment-matrix-prod-20260922_082458.csv` (1000 unique PASS).  
**Matrix re-run:** `fulfillment-matrix-prod-20260923_040427.csv` — watch `MATRIX-WATCH-DUAL.md`.

Updated: 2026-09-23

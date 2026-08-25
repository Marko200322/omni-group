# Factory machine — JA closeout checklist (no Stripe / LLC)
# Updated: 2026-08-25

## Scope
Factory **M0→M5** on VPS (PHASE stays **v2**). Outbound **send OFF**. Stripe + LLC = TI later.

## BLOK 0 — already done
- [x] VPS web+api+pg+redis+caddy
- [x] Auth / register / IBAN / Confirm path (code)
- [x] Catalog 17×50 + fulfillment handlers
- [x] Resend + CRM ingress + Telegram + OpenRouter + Hunter key
- [x] Legal refund/impressum + `/metrics` + SafeDeploy + offsite dump copy

## BLOK 1 — JA
- [x] **1.2** Invoice/proforma PDF via Resend attachments (`EMAIL_FROM` ← Resend from; SMTP not required)
- [x] **1.6** M3 surface smoke (pricing/register/legal + industry catalog + payments methods)
- [ ] **1.1** Mystery shopper — **TI**
- [ ] **1.3** DMARC — **TI**
- [ ] **1.4** UptimeRobot — **TI**
- [ ] **1.5** Rollback owner — **TI**

## BLOK 2 — JA
- [x] **2.1** `factoryPhase=M5`, `monthlyBudgetEur=250`, `prodMode=full`, `factoryPhaseAuto=false`
- [x] **2.2** Lead DB ON via factory profile (F3) — warm-lean wipe skipped for M4+
- [x] **2.3** M4 daily hunt cron installed (`M4_OUTBOUND_SEND=0`)
- [x] **2.4** CRM seed script + run (`scripts/seed-crm-contacts.ps1`)
- [x] **2.9** Titanis / autonomy / hunting readiness smoke (`scripts/machine-closeout-smoke.ps1`) — PASS (analytics admin/overview)
- [x] **2.4** CRM seed: **50** contacts (`seed.lead.*@mailinator.com`)
- [x] **2.3** Hunt cron installed + one-shot run (send_flag=0, processOutbound=false)
- [x] Deploy env sync fix: `deploy-to-vps.ps1` now SCP-uploads `.env.vps.prod` files (tar used to skip them)
- [ ] **2.6** NeverBounce — **TI**
- [ ] **2.7** Domain warmup proof — **TI**
- [x] **2.8** Send stays **OFF** until TI warmup (correct)
- [ ] **2.10** Ads €200–300 — **TI**

## BLOK 3 — JA
- [x] **3.1** Autonomy ON (scheduler + marketing flag + reinvest 0.2) · `AUTONOMY_AUTO_DEPLOY=false`
- [x] **3.2** Budget €250 + AI daily caps from budget profile
- [x] **3.3** Autonomy status smoke (BFF)

## BLOK 4 — JA (prep only; Stripe/LLC blocked on TI)
- [x] **4.5** Lead F5 **not** forced (needs M6 + verify keys) — stays F3 until Stripe path
- [ ] **4.1** LLC fields — **TI**
- [ ] **4.2** Lawyer — **TI**
- [ ] **4.3** Stripe live — **TI**
- [ ] **4.4** Avatar keys — **TI**
- [ ] **4.6** Bump M6 — **blocked** until Stripe keys

## Safety locks left ON
- `M4_OUTBOUND_SEND=0`
- `OUTREACH_DOMAIN_WARMUP_COMPLETE=false` (M4+ profile)
- `AUTONOMY_AUTO_DEPLOY=false`
- `PAYMENTS_MODE=manual` (no Stripe keys)
- PHASE `v2` (no K8s v5/v6)

## Commands
```powershell
.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy
.\scripts\install-m4-daily-cron.ps1   # or key-based install used in closeout
.\scripts\seed-crm-contacts.ps1 -Count 50
.\scripts\machine-closeout-smoke.ps1
```

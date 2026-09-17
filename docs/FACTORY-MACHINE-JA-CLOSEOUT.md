# Factory machine — closeout (verified)

**Kanonski status:** [`STATUS-KANON.md`](./STATUS-KANON.md) · snapshot [`REPO-STATUS-NOW.md`](./REPO-STATUS-NOW.md)  
**Ažurirano:** 2026-09-17  
**Scope:** factory na VPS. Bez pretpostavki — samo provereno.

## Scope
- Live `FACTORY_PHASE=**M6**`, `PHASE=v2`, `prodMode=full`, `monthlyBudgetEur=250`, `factoryPhaseAuto=false`
- Stripe na produ = **TEST** (ne live)
- Outbound send: ne tretirati kao “masovno ON” dok TI ne potvrdi warmup u provider UI
- LLC + Stripe live = **TI**

---

## BLOK 0 — already done (verified / evidence)

- [x] VPS web+api+pg+redis+caddy
- [x] Auth / register / IBAN / Confirm path
- [x] Catalog 17×50 + fulfillment handlers
- [x] Fulfillment matrix **850/850 PASS** (M6) — `docs/evidence/fulfillment-matrix-prod-m6-20260902.csv`
- [x] Resend (nested) + CRM ingress + Telegram + OpenRouter + Hunter
- [x] Instantly API + campaign ID SET
- [x] Apollo + NeverBounce + ZeroBounce SET
- [x] D-ID SET
- [x] Legal routes in web (terms/privacy/refund/impressum/cookies)
- [x] `/metrics` + SafeDeploy + backup evidence
- [x] GitHub `main` branch protection
- [x] `factoryPhase=M6` bump + deploy (2026-09)

---

## BLOK 1 — TI ops

- [ ] **1.1** Mystery shopper — **TI**
- [x] **1.2** Invoice/proforma PDF capability in code path — **[~]** email attachment E2E još open (vidi ADMIN Tier A #8)
- [ ] **1.3** DMARC — **TI**
- [ ] **1.4** UptimeRobot — **TI**
- [x] **1.5** Rollback owner — **DONE** ([`ROLLBACK-OWNER.md`](./ROLLBACK-OWNER.md) · Marko Kosic)
- [~] **1.6** M3/M6 surface smoke — machine-closeout historically PASS; ponovi posle live Stripe

---

## BLOK 2 — factory / lead

- [x] **2.1** `factoryPhase=M6`, budget €250, `prodMode=full`, auto false
- [x] **2.2** Lead DB ON — rollout **F3** (ne F5)
- [x] **2.3** M4 daily hunt cron (installed historically); send not assumed ON
- [x] **2.4** CRM seed ≥50 (historically done)
- [x] **2.9** Titanis / hunting readiness smoke — historically PASS
- [x] **2.6** NeverBounce key — **SET** in deploy.config (TI scale policy još odluka)
- [~] **2.7** Domain warmup — KLJUCEVI flag `OUTREACH_DOMAIN_WARMUP_COMPLETE=true` · **TI** UI dokaz još
- [ ] **2.8** Cold outbound send ON — **blocked** on TI warmup/DMARC potvrdu
- [ ] **2.10** Ads €200–300 — **TI**

---

## BLOK 3 — autonomy / budget

- [x] **3.1** Autonomy stack present (auto-deploy stays false unless changed)
- [x] **3.2** Budget €250 + caps from profile
- [x] **3.3** Autonomy/hunting status smoke historically PASS

---

## BLOK 4 — M6 / Stripe / LLC

- [x] **4.6** Bump **M6** — **DONE** (test Stripe keys)
- [ ] **4.1** LLC fields — **TI** EMPTY
- [ ] **4.2** Lawyer — **TI**
- [ ] **4.3** Stripe **live** — **TI** (test already SET)
- [~] **4.4** Avatar — D-ID SET · HeyGen EMPTY
- [x] **4.5** Lead F5 **not** forced — remains **F3** until TI verify/scale policy

---

## Safety locks (current intent)

| Lock | Stanje |
|------|--------|
| `factoryPhaseAuto` | **false** |
| Stripe | **test** until TI live |
| Cold outbound send | treat as **OFF** until TI confirms warmup/DMARC |
| `AUTONOMY_AUTO_DEPLOY` | keep **false** unless explicitly enabled |
| `PHASE` | **v2** (no K8s) |

---

## KLJUČEVI — EMPTY (opciono)

Vidi [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md) · `.\scripts\audit-empty-keys.ps1`  
Prioritet opciono: Slack ×2, Lusha, Tavily, PayPal/Wise (P3 u [`STATUS-KANON.md`](./STATUS-KANON.md)).

---

## Novi modul (2026-09)

- [x] `tools/outreach-engine/` — Agent1 Scout + Agent2 Supervisor + guardrails + n8n JSON
- [ ] Live n8n: Tavily + OpenAI + import workflow — **TI+JA**

---

## Commands

```powershell
# Status istine
# pročitaj docs/REPO-STATUS-NOW.md

.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy
.\scripts\machine-closeout-smoke.ps1
.\scripts\e2e-fulfillment-matrix-prod.ps1 -Resume -ReportCsv "docs\evidence\fulfillment-matrix-prod-m6-20260902.csv"
.\scripts\check-stripe-env.ps1
```

**Posle svake promene:** ažuriraj [`STATUS-KANON.md`](./STATUS-KANON.md) + datum ovde.

# Business start — gde smo (snapshot)

**Updated:** 2026-09-23 04:10 (Europe/Belgrade)  
**Prod:** https://omnigrouptech.com · https://api.omnigrouptech.com  
**Branch:** `feat/phase10-outreach-send-enabled`

---

## Jedna rečenica

**Možeš krenuti prodaju (manual checkout + fulfillment + kontakt + outbound sa nadzorom).**  
**Formalni „100%“ go-live** (firma na fakturi, Stripe **live**, advokat) — još **P2 + P0-07 + mystery-shopper PDF refresh**.

---

## Gate-ovi danas (2026-09-23)

| Test | Rezultat |
|------|----------|
| `verify-billing-catalog-mirror.ps1` | **PASS** (19 anchors) |
| `verify-industry-package-matrix-prod.ps1` | **PASS** (50×20) |
| `audit-prod-autonomous.ps1` | **13 PASS, 0 FAIL, 2 TI** → `docs/generated/PROD-AUDIT.md` |
| M4 launch gate | **26 PASS / 2 FAIL** → `m4-launch-gate-20260923_040451.md` |
| M4 packages-only fulfillment | **13/13 PASS** → `m4-packages-only-20260923_040451.csv` |

**M4 gate FAIL (očekivano na M6 prod):**

1. **Pricing landing anchor** — UI copy/range check (prod je M6, ne M4 pricing snapshot).
2. **`verify-factory-phase.ps1` M4 profile** — prod je **M6**, outreach send ON, autonomy distinkt od M4 skripte — **ne gasi prodaju**.

---

## Fulfillment matrix (1000 ćelija)

| Run | Status |
|-----|--------|
| **2026-09-22** `fulfillment-matrix-prod-20260922_082458.csv` | **KANON** — **1000/1000** unique PASS (go-live dokaz; raw 1351 = resume duplikati) |
| **2026-09-23** `fulfillment-matrix-prod-20260923_040427.csv` | **Opcioni re-run** — prati se paralelno; ne zamenjuje 22.09. |

**Prati oba:**

```powershell
cd "C:\dev\omni group"
.\scripts\watch-fulfillment-matrix-dual.ps1 -Once
.\scripts\watch-fulfillment-matrix-dual.ps1 -IntervalSec 90
# -> docs/evidence/MATRIX-WATCH-DUAL.md
```

**Log:** `fulfillment-matrix-prod-20260923_040427.csv.run.log`  
**Resume (jedan proces):** `.\scripts\run-fulfillment-matrix-prod-resume.ps1 -ReportCsv docs\evidence\fulfillment-matrix-prod-20260923_040427.csv`

---

## Spremno za posao (DA)

- Site + API health, admin login, CSRF BFF
- **50** industrija × **20** paketa — API i pricing UI
- Manual checkout → confirm → fulfillment (M4 sample + stari full matrix)
- Resend kontakt, Slack webhooks, Problem Hunter, catalog-quality
- Outbound: warmup + send enabled (monitor bounces / Instantly plan)
- Marketing: home, pricing, products, services, contact, **907** `/solutions/*`, legal stranice u kodu
- Factory **M6**, budžet **€250/mo**

---

## Pre „apsolutno sve“ (TI / P2)

| ID | Akcija |
|----|--------|
| **P2-01** | `companyLegalName`, tax, adresa u `deploy.config.json` → redeploy |
| **P2-02** | Stripe **LIVE** ključevi + webhook smoke (sada test vs `PAYMENTS_MODE=live`) |
| **P0-07** | Formalni legal sign-off |
| **P0-06** | Jedan checkout → **PDF u inboxu** (auditu TI 7d) |
| **Ručno** | Mobile `/pricing` checkout; 3× `/solutions/*` copy OK za sales |

---

## Katalog (referenca)

- Industry grupe: **50**
- Paketi: **20** (17 SKU + 3 bundle)
- Vertikale: **907** landinga
- Mirror: web ↔ Atina `deliverable-catalog.ts`

---

## Brze komande

```powershell
cd "C:\dev\omni group"
.\scripts\audit-prod-autonomous.ps1
.\scripts\verify-industry-package-matrix-prod.ps1
.\scripts\run-go-live-today.ps1 -SkipDeploy
.\scripts\run-vps-finish-repo.ps1 -FollowLog   # opciono CI-paritet na VPS
```

**Prodaj danas:** `/pricing` → industrija → **Buy now** → manual confirm u adminu.

**Klijentski portal (checklist):** [`CLIENT-PORTAL-QA.md`](CLIENT-PORTAL-QA.md)

---

*Ažuriraj ovaj fajl kad matrix 20260923 stigne 1000/1000 unique PASS ili posle P2 deploy-a.*

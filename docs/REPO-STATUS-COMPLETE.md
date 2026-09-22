# Omni Group — kompletan status repoa

**Datum:** 2026-09-22  
**Branch:** `feat/phase10-outreach-send-enabled` (nije push-ovan kompletan prelaunch diff)  
**Prod:** https://omnigrouptech.com · API https://api.omnigrouptech.com  

---

## 1. Executive summary

| Oblast | Status |
|--------|--------|
| **Prod health** | Web + API health PASS (`audit-prod-autonomous`) |
| **Katalog prodaje** | **50** industry grupa × **20** paketa — API verify **PASS** |
| **Cene (web ↔ Atina)** | Mirror verify **PASS** (19 anchor redova u raw katalogu; 20. SKU kroz spec) |
| **Mejlovi** | Resend verified, kontakt `sent_via_resend` |
| **Marketing outbound** | Warmup complete; `sendEnabled=true` posle deploy sync-a |
| **Factory** | **M6**, full profil, budžet **250 EUR/mo** |
| **Legal / firma** | **P0** — impressum polja prazna u deploy config |
| **Stripe live** | **P0** — test ključevi vs `PAYMENTS_MODE=live` |
| **907 vertikala** | Jedinstveni slug-ovi; duplikati **imena** su različite niše (nije auto-brisano) |

Detaljan pre-launch audit: [`OMNI_PRELAUNCH_AUDIT.md`](OMNI_PRELAUNCH_AUDIT.md)  
Go-live checklist: [`evidence/GO-LIVE-TODAY.md`](evidence/GO-LIVE-TODAY.md)  
Prod audit (auto): [`generated/PROD-AUDIT.md`](generated/PROD-AUDIT.md)  
M4/M6 gate: [`evidence/M4-LAUNCH-GATE-LATEST.md`](evidence/M4-LAUNCH-GATE-LATEST.md)  

---

## 2. Arhitektura (jedna strana)

```
omnigroup-web (Next.js) ──BFF /api/atina/*──► atina-platform/atina (Express)
       │                                              │
       ├─ /api/contact ──► Resend, Slack, CRM         ├─ billing, payments, fulfillment
       └─ marketing + dashboard                      └─ industry catalog, public-site
atina-system (Nest) · Python src/ (Forge, Astra) · scripts/ (deploy, gates)
```

**Source of truth za checkout:** Atina `billing` + `payments` moduli.  
**Web mirror:** `apps/omnigroup-web/src/lib/*` — mora proći `verify-billing-catalog-mirror.ps1`.

---

## 3. Katalog i pricing

| Stavka | Vrednost |
|--------|----------|
| Industry grupe | 50 (`category-pricing.ts`) |
| Sellable paketi | 20 (17 SKU + 3 bundle) |
| Vertikalni landingi | 907 (`generated-verticals-index.json`, sve `hasPage: true`) |
| Matrica | `package-industry-matrix` + BFF `/api/atina/billing/package-matrix` |
| Checkout gate | `package-delivery-spec.ts` → Buy now / Notify me (`OfferCard`) |

---

## 4. Produkcija (poslednji gate-ovi)

| Skripta | Rezultat (2026-09-22) |
|---------|------------------------|
| `audit-prod-autonomous.ps1` | **13 PASS, 0 FAIL, 2 TI** |
| `verify-industry-package-matrix-prod.ps1` | **ALL PASS** (50×20) |
| `verify-billing-catalog-mirror.ps1` | **PASS** |

**TI (ne blokira ručnu prodaju):** P0-07 legal counsel; P0-06 mystery shopper PDF inbox.

---

## 5. Git / lokalne izmene

- **~57 fajlova** na grani (M6 katalog, matrix, deploy skripte, prelaunch UX, cene sync).
- **Untracked važno:** `HomePageClient.tsx`, `public-catalog-stats.ts`, `OMNI_PRELAUNCH_AUDIT.md`, `verify-billing-catalog-mirror.ps1`, `m6-prod-rollout.ps1`, `M6-PROD-20260922.md`.
- **Nikad commit:** `deploy-secrets.local/*`, DB dump u `offsite-backups/` (lokalni backup).

---

## 6. Testovi (referenca)

| Komanda | Šta |
|---------|-----|
| `.\scripts\verify-billing-catalog-mirror.ps1` | Cene web = Atina |
| `.\scripts\verify-industry-package-matrix-prod.ps1` | Prod matrica |
| `.\scripts\audit-prod-autonomous.ps1` | Prod smoke + DNS + kontakt |
| `cd atina-platform/atina && npm run test:ci` | Unit + coverage (prior PASS) |
| `cd apps/omnigroup-web && npm run build` | Web build (PASS posle prelaunch) |
| `.\scripts\verify-monorepo.ps1` | Pun CI mirror |

VPS finish log: `/var/log/omni-finish-repo-test.log` — smoke PASS; `test:ci` exit 1 u jednom run-u (vidi `REPO-TEST-FINISH.md`).

---

## 7. Duplikati — šta je očišćeno / šta nije

### Očišćeno (2026-09-22)

- **14 zastarelih evidence fajlova** (prazni CSV aug/sept, stari M4 batch-evi aug 2025) — skripta `clean-stale-evidence.ps1 -Apply`.
- **Zadržano:** `fulfillment-matrix-prod-20260922_082458.csv`, `m4-packages-only-20260922_075812.csv`, `M4-LAUNCH-GATE-LATEST.md`, `fulfillment-matrix-prod-m6-20260902.csv`, `fulfillment-matrix-prod-full.csv`.

### Namerno nije dirano

| Tip | Razlog |
|-----|--------|
| **907 vertikala** | 0 duplih slug-ova; ista imena u različitim kategorijama su različite niše |
| **Web + Atina billing lib** | Arhitekturni mirror — sync skriptom, ne brisanje |
| **`prod-audit.md` + `PROD-AUDIT.md`** | Isti sadržaj — web bundle za `/dev/status` + docs kanon |
| **`legal` vs `legal_services` kategorije** | Različiti slug-ovi u taksonomiji — konsolidacija = migracija + redirect |

---

## 8. P0 — owner akcije

1. Popuni **company legal** u `deploy.config.json` → redeploy web env.  
2. **Stripe live** ključevi + webhook dokaz ili privremeno `PAYMENTS_MODE=test`.  
3. Advokat: Terms/Privacy/Refund/Impressum.  
4. **Commit + push** grane (git user.name/email ako fali).  
5. **SafeDeploy** posle commit-a (homepage, kontakt, cene).

---

## 9. Brze komande (copy-paste)

```powershell
cd "C:\dev\omni group"
.\scripts\verify-billing-catalog-mirror.ps1
.\scripts\audit-prod-autonomous.ps1
.\scripts\verify-industry-package-matrix-prod.ps1
.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy
```

---

*Generisano kao kanonski “ceo repo” snapshot; ažuriraj posle svakog većeg deploy-a ili M-phase bump-a.*

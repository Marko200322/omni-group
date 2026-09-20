# Omni Group — Test Coverage Matrix (Phase 5)

**Generated:** 2026-09-20  
**Phase:** 5 — read-only test inventory (no code changes)  
**Inputs:** Phase 1–4 docs, [`../TEST-PLAN-KOMPLETAN.md`](../TEST-PLAN-KOMPLETAN.md), repo test layout  
**Rule:** Gaps **G-01+** for Phase 10+; no source changes in Phases 1–9.

---

## 1. Executive summary

Quality gates are **layered** (CI unit → [`verify-monorepo.ps1`](../../scripts/verify-monorepo.ps1) → smoke → PS E2E → prod audit), not uniform coverage. Lokalni pun mirror = job **`python`** / required check **`Python (Doslednost dok + pytest)`** ([`GIT-BRANCH-PROTECTION.md`](../GIT-BRANCH-PROTECTION.md)); uključuje **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; dublji Atina gate posle servisa: **`npm run smoke:all`** u `atina-platform/atina`.

| Area | Strongest | Weakest |
|------|-----------|---------|
| Atina API | 375 unit tests + Jest thresholds | Integration not in monorepo CI; many coverage exclusions |
| Billing E2E | Unit + PS scripts + P0-06 IMAP | Stripe LIVE webhook matrix |
| Web BFF | build + smoke + prod audit | **No** Jest; ~136 routes |
| Deploy scripts | docker-prod-test + post audit | deploy-*.ps1 untested |

---

## 2. Matrix (legend: Y present · P partial · — none)

### Web BFF

| Sub-area | Unit | Integration | E2E | Prod-audit |
|----------|------|-------------|-----|------------|
| Auth BFF | — | — | P smoke | Y login |
| `/api/atina/*` | — | — | P sample | P hunting/PH |
| `/api/contact` | — | — | P | Y POST |
| Marketing UI | — | — | — | — (build only) |

### Atina API

| Sub-area | Unit | Integration | E2E | Prod-audit |
|----------|------|-------------|-----|------------|
| Auth | Y | Y | Y smoke | Y health |
| Billing/payments | Y | P | Y billing E2E | P |
| Fulfillment/factory | P (exclusions) | — | Y fulfillment scripts | — |
| Autonomy/outreach | P | — | Y smokes | P warmup |

### Deploy

| Sub-area | Unit | E2E | Prod-audit |
|----------|------|-----|------------|
| verify-monorepo | — | — | — |
| docker-prod-test | — | P | — |
| deploy-from-local-secrets | — | M | P indirect |
| audit-prod-autonomous | — | — | Y |

---

## 3. Critical flows F-01–F-12

| ID | Flow | Best gate |
|----|------|-----------|
| F-02 | Register + plan purchase | e2e-register + Atina unit |
| F-03 | Invoice PDF | e2e-billing-manual + P0-06 audit |
| F-04 | 17-package fulfillment | e2e-fulfillment-* |
| F-05 | Contact lead | prod audit CONTACT |
| F-06 | Outbound readiness | smoke-hunting + P0-03 |
| F-08 | DMARC/SPF/DKIM | audit + verify-dns |
| F-11 | Stripe webhooks | **gap** (G-06) |

---

## 4. Gap register (prioritized)

| ID | Priority | Gap |
|----|----------|-----|
| G-01 | P0 | Web BFF no test framework; 136 routes |
| G-02 | P0 | Fulfillment excluded from Atina coverage |
| G-03 | P0 | Atina integration not in CI |
| G-04 | P0 | Web smoke not in CI |
| G-05 | P1 | Deploy scripts untested |
| G-06 | P1 | Stripe webhook signature suite (S-13) |
| G-07 | P1 | Dual API exposure route inventory |
| G-08 | P1 | Autonomy modules coverage excluded |
| G-13 | P2 | No SBOM/CVE gate (S-18) |

Full list through **G-15** in desk notes; consolidate in [`master-audit.md`](./master-audit.md).

---

## 5. Phase 5 exit criteria

- [x] Four areas mapped to coverage types  
- [x] Critical flows tied to scripts  
- [x] Gap register **G-01+**

**Next:** [`reliability-performance-mobile-audit.md`](./reliability-performance-mobile-audit.md) (Phases 6–8).

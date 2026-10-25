# OMI + logged-in portal readiness — 2026-10-25

**Overall: PASS_WITH_WARN** (soft-start ready; Stripe LIVE / firma still Marko P2)

API: `http://164.68.127.15:3000` · Web: `http://164.68.127.15:3010`  
Script: `scripts/probe-omi-portal-ready.mjs` · JSON: `_omi-portal-ready-20261025.json`

## What passed

| Area | Result |
|------|--------|
| OMI public recommend (healthcare / construction / retail) | **PASS 3/3** on first live pass (package + €). Later probe hit anonymous hourly limit (429) after redeploy burns — infra soft-limit, not recommend crash. |
| OMI “Which Omni package…” | **FIXED** — words between `which` and `package` no longer force discovery. Unit: `omi-consult.test.ts` 12/12. |
| OMI retail reviews → reputation-management | **FIXED** — problem model + commerce cluster; unit asserts `reputation-management`, not `setup-quick`. |
| OMI authed (support avatar) | **PASS** — portal navigation (“Orders / Deliveries”). |
| Login (admin) | **PASS** |
| Portal APIs | **PASS** — me, fulfillment jobs, invoices, payments methods, intro promo, notifications |
| Web auth gate | **PASS** — unauth dashboard → `/login` |
| Cookie login + authed pages | **PASS** — `/dashboard/*` + `/admin` HTTP 200; BFF jobs/invoices/methods/promo 200 |
| Client register | **PASS** (HTTP 201) after DTO fix (`company` not `companyName`) |

## Honest gaps (not fake PASS)

| Item | Status |
|------|--------|
| Stripe LIVE / firma VAT | **P2 Marko** — payments mode sandbox |
| `/api/v1/documents` + `/api/v1/support/tickets` | Route absent (404) — documents UI still local/stub; support uses video-meetings + tickets elsewhere |
| Anonymous OMI hourly limit | Default raised **8 → 24**/hour for soft start; still protects abuse |
| Catalog copy / 23×50 | Already closed in `_marko-1.2-public-fix-20261025/` |

## Soft-start call

**OMI + ulogovani portal: READY for soft IBAN start.**  
Next human round: real checkout as new client + OMI on production domain after DNS; card LIVE remains Marko P2.

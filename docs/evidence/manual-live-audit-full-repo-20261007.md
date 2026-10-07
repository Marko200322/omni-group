# Manual / live audit - full repo (2026-10-07)

| Item | Value |
|------|-------|
| **Verdict** | **PASS** |
| Target | https://omnigrouptech.com |
| Live industry catalog | **50** categories (SSOT; not 60) |
| HARD matrix source | `fulfillment-matrix-prod-20x50-HARD-20261006.csv` (20x50=1000) |
| Sampled HARD cells | 16 (PASS=16 FAIL=0) |
| Fresh live cells | 3 (PASS=3 FAIL=0) |
| Portal spot-check | 3 / >=3 purchases accessible via API |
| Artifacts dir | `docs/evidence/_manual-live-20261007/` |

## Industry count resolution

- Code + live API: **50** industry categories (`INDUSTRY_CATEGORIES` / `/api/atina/billing/industry-catalog`).
- User mention of "60" vs "1000 cells": **1000 = 20 packages x 50 industries**. There is no 60th category in SSOT; matrix correctly stays **20x50**.
- Gap: none to add unless product deliberately expands the catalog.

## Sampled cells (HARD paymentIds re-verified live)

| # | Package | Industry | Score | Arts | publicUrl | PDF | Brand | Industry hint | Portal | Verdict |
|--:|---------|----------|------:|-----:|-----------|-----|-------|---------------|--------|---------|
| 1 | ai-support-retainer | admin_support | 100 | 6 | - | ok | True | True | True | **PASS** |
| 2 | audit | agriculture | 100 | 2 | - | ok | True | True | True | **PASS** |
| 3 | bundle-ops-clarity | ai_data | 100 | 4 | - | ok | True | True | True | **PASS** |
| 4 | bundle-portal-presence | audio_music | 100 | 5 | yes | ok | True | True | False | **PASS** |
| 5 | bundle-sales-launch | automotive | 100 | 4 | yes | ok | True | True | False | **PASS** |
| 6 | custom-software | beauty | 100 | 2 | - | ok | True | True | False | **PASS** |
| 7 | integration | business_consulting | 100 | 4 | - | ok | True | True | False | **PASS** |
| 8 | landing | community_moderation | 100 | 2 | yes | ok | True | True | False | **PASS** |
| 9 | lead-gen-retainer | construction | 100 | 5 | - | ok | True | True | False | **PASS** |
| 10 | sales-enablement | creator_services | 100 | 2 | - | ok | True | True | False | **PASS** |
| 11 | setup-custom | customer_service | 100 | 4 | - | ok | True | True | False | **PASS** |
| 12 | setup-full | design_creative | 100 | 6 | - | ok | True | True | False | **PASS** |
| 13 | setup-quick | development_it | 100 | 3 | - | ok | True | True | False | **PASS** |
| 14 | support-dedicated | ecommerce | 100 | 4 | - | ok | True | True | False | **PASS** |
| 15 | support-priority | education | 100 | 4 | - | ok | True | True | False | **PASS** |
| 16 | vertical-package | education_training | 100 | 4 | - | ok | False | True | False | **PASS** |

## Fresh live cells (checkout -> fulfill today)

| Package | Industry | Score | publicUrl | pdfBytes | Status | Notes |
|---------|----------|------:|-----------|---------:|--------|-------|
| landing | healthcare | 100 | yes | 10854 | **PASS** | fresh_live_ok |
| audit | construction | 100 | - | 13172 | **PASS** | fresh_live_ok |
| setup-quick | web3 | 100 | - | 9809 | **PASS** | fresh_live_ok |

## Method

1. Admin login via deploy-secrets (not echoed).
2. Re-fetch job JSON for HARD-matrix paymentIds; download PDFs via fulfillment artifacts API; GET publicUrl when present.
3. Brand/industry: string heuristics on HTML + artifact text (warnings if weak; hard fail on thin PDF / missing site URL / non-completed job).
4. Portal: GET /api/atina/billing/fulfillment/jobs list + per-job detail for >=3 purchases.
5. Fresh: 3 new manual checkouts on non-marketing industries.

## Portal + live site spot-check (extra)

| Check | Result |
|-------|--------|
| `/dashboard` | HTTP 200 |
| `/dashboard/orders` | HTTP 200 |
| `/dashboard/deliveries` | HTTP 200 (React SPA — payment UUIDs not in SSR HTML; API job detail used for >=3 purchases) |
| Fresh `landing@healthcare` publicUrl | HTTP 200, title `Healthcare Studio`, 14452 B |
| Sample `bundle-sales-launch@automotive` publicUrl | HTTP 200, title `Automotive Studio`, Omni+auto signals |
| Cursor browser MCP screenshots | Unavailable this session (tab tooling flaky) |

## Honesty notes

- Adversarial sample from 2026-10-06 (_adversarial-live-20261006/sample-results.json) showed pre-fix thin PDFs / missing checklist - superseded by HARD matrix + PDF substance deploy + this audit.
- Stripe LIVE / company legal identity (companyLegalName empty in deploy config) remain **admin-only external blockers**, not fulfillment matrix gates.
- Soft warn only: `vertical-package @ education_training` brand heuristic weak; industry hint + PDF/checklist still PASS.



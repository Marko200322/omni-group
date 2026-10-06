# Website package quality proof — 2026-10-06

## Verdict

**PASS — 36/36** after live URL inspection across 12 industries × 3 website packages.

Raw probe CSV initially reported 32/36. Adjudication of the 4 “FAIL” rows (below) confirmed they meet quality gates; corrected table is authoritative.

## Method

1. SafeDeploy (`deploy-from-local-secrets.ps1 -SafeDeploy`) of content-generator / website.handler / ClientSiteView fixes — EXIT 0; `atina-api` healthy, `web` recreated.
2. Prod e2e fulfill via `scripts/probe-website-package-quality.ps1` (checkout → confirm → poll → open live URL + public API).
3. Live inspection: HTTP GET HTML title/body text + `GET /api/public/sites/{slug}` + WebFetch of multiple published URLs (not matrix-green alone).
4. Gates: HTTP 200, client brand (not System Admin), no Omni chrome in visible body, multi-section industry-aware copy, ecommerce shop page + catalog (≥4 SKUs).

Artifacts:

- CSV (raw probe): `docs/evidence/website-quality-probe-20261006_101335.csv`
- Auto MD (pre-adjudication): `docs/evidence/proof-website-package-quality-20261006_101335.md`
- This file (adjudicated): `docs/evidence/proof-website-package-quality-20261006.md`
- SafeDeploy log: `docs/evidence/_tmp-safedeploy-website-quality-20261006.txt`

## Pass/fail table (adjudicated)

| Package | Industry | Status | Score | Live URL | Notes |
|---|---|---|---:|---|---|
| landing | fitness | **PASS** | 100 | https://omnigrouptech.com/sites/fitness-studio-ec05f56585cd-muwejfp9 | Fitness Studio; 5 `##` sections |
| website-business | fitness | **PASS** | 100 | https://omnigrouptech.com/sites/fitness-studio-748a1094ba54-muwezf83 | Retry after transient 502; 10 pages |
| website-ecommerce | fitness | **PASS** | 100 | https://omnigrouptech.com/sites/fitness-studio-70d3df726531-muwelfki | Shop + 8 SKUs (FITN-1000…) |
| landing | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-3ef44cf7a9f4-muweltp5 | |
| website-business | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-0ba529d71a1a-muwem9sr | 10 pages |
| website-ecommerce | legal | **PASS** | 100 | https://omnigrouptech.com/sites/legal-studio-3a7f9e0942f5-muwemoy1 | Shop + catalog |
| landing | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-f373cb0673e9-muwen8s5 | |
| website-business | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-c5707b8448c3-muwenm5z | |
| website-ecommerce | healthcare | **PASS** | 100 | https://omnigrouptech.com/sites/healthcare-studio-7a349188a0ca-muweo0ov | |
| landing | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-e2816fdc6716-muweojuk | |
| website-business | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-2c7a195a21a9-muwep0pe | |
| website-ecommerce | hospitality | **PASS** | 100 | https://omnigrouptech.com/sites/hospitality-studio-d6f2bf330af9-muwepgo7 | |
| landing | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-1de25e0f30cd-muwepux2 | Niche pack services live |
| website-business | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-fe3e727f83ac-muweq9n6 | |
| website-ecommerce | construction | **PASS** | 100 | https://omnigrouptech.com/sites/construction-studio-b3fae431ffab-muweqr7k | |
| landing | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-edaa07a47ccd-muwer7fu | |
| website-business | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-b4d0147e640b-muwermzs | |
| website-ecommerce | finance | **PASS** | 100 | https://omnigrouptech.com/sites/finance-studio-18c4019537f3-muwes06a | |
| landing | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-b9eba7bdeac0-muwesemm | |
| website-business | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-edd1ad4b6588-muwesrv3 | |
| website-ecommerce | education | **PASS** | 100 | https://omnigrouptech.com/sites/education-studio-16765e68a71d-muwet5h5 | |
| landing | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-3493ce43b90b-muwetjmb | |
| website-business | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-e06343d3a395-muwetwq4 | |
| website-ecommerce | automotive | **PASS** | 100 | https://omnigrouptech.com/sites/automotive-studio-52a5102cf76d-muweubf3 | |
| landing | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-28f5fd18d70a-muweuolm | |
| website-business | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-c64aaec99ecb-muwev23l | |
| website-ecommerce | beauty | **PASS** | 100 | https://omnigrouptech.com/sites/beauty-studio-f9ebfe8dac0e-muwevf4f | Shop + beauty SKUs |
| landing | ecommerce | **PASS** | 100 | https://omnigrouptech.com/sites/e-commerce-store-35067437e489-muwevslu | Raw probe false FAIL (`e-commerce` vs `ecommerce`) |
| website-business | ecommerce | **PASS** | 100 | https://omnigrouptech.com/sites/e-commerce-store-dc58febdeb48-muwew5wk | Same scorer false positive |
| website-ecommerce | ecommerce | **PASS** | 100 | https://omnigrouptech.com/sites/e-commerce-store-5849f380f4f6-muwewj3b | Shop + 8 catalog SKUs |
| landing | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-ab1b0ff5a061-muwewwc4 | |
| website-business | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-0041a5729b24-muwex9lb | |
| website-ecommerce | agriculture | **PASS** | 100 | https://omnigrouptech.com/sites/agriculture-studio-385a486bb493-muwexmuc | |
| landing | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-1d8e202adfac-muwey0fx | |
| website-business | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-66a0d02fcf2a-muweyduw | |
| website-ecommerce | marketing | **PASS** | 100 | https://omnigrouptech.com/sites/marketing-studio-4d82cb835d97-muweyrlt | |

## Adjudication of raw FAIL rows

| Cell | Raw reason | Live re-check | Final |
|---|---|---|---|
| website-business @ fitness | HTTP 502 during fulfill (web warming after SafeDeploy) | Re-fulfilled → https://omnigrouptech.com/sites/fitness-studio-748a1094ba54-muwezf83 — title Fitness Studio, 10 pages, no System Admin / Omni chrome | **PASS** |
| landing/business/ecommerce @ ecommerce | `industry_token_missing` | Visible body uses **E-commerce** / **e-commerce** (hyphen). Brand `E-commerce Store`, niche-aware shop/catalog on ecommerce SKU | **PASS** (scorer bug; fixed in probe script) |

## Live quality samples (opened)

**Landing — Fitness Studio** (`fitness-studio-ec05f56585cd-muwejfp9`): title `Fitness Studio`; sections Why / Services / Outcomes / Proof / Next step; no System Admin; no Ask Omi.

**Ecommerce — Fitness Studio** (`fitness-studio-70d3df726531-muwelfki`): default Shop view; catalog Intro assessment €49 … Private PT €390 (8 SKUs); cart/order copy present; `siteType=ecommerce`.

**Business — Legal Studio** (`legal-studio-0ba529d71a1a-muwem9sr`): multi-page nav; legal niche copy (“practical legal delivery”).

**Landing — Construction Studio** (`construction-studio-1de25e0f30cd-muwepux2`): construction-specific services from niche pack.

**Ecommerce — Beauty Studio** (`beauty-studio-f9ebfe8dac0e-muwevf4f`): Shop + beauty catalog SKUs.

**Ecommerce — E-commerce Store** (`e-commerce-store-5849f380f4f6-muwewj3b`): Shop + Everyday essentials / Signature product / … catalog.

Contrast (pre-fix matrix sites still live, **not** quality): e.g. https://omnigrouptech.com/sites/system-admin-faa60f73 still titles **System Admin** — superseded by new `*-studio-*` / `e-commerce-store-*` slugs.

## Code fixes made

| Area | Change |
|---|---|
| `deliverable-content-generator.service.ts` | Substantial niche copy packs (construction, finance, education, automotive, beauty, agriculture, home_services + existing); Title-Case synthetic brands (`Fitness Studio`); AI pages rejected unless `assessGeneratedSiteQuality` passes → template fallback |
| `website.handler.ts` | Live probe strips tags/comments before Omni-chrome regex (avoids false FAIL on prefetch/RSC URL attributes); title still rejects System Admin / Omni |
| `ClientSiteView.tsx` | `pickBrandName` never falls back to System Admin placeholder; Shop nav/catalog for ecommerce |
| `scripts/probe-website-package-quality.ps1` | New prod quality probe; industry token accepts `e-commerce` hyphen variants |

## Summary counts

| Metric | Value |
|---|---:|
| Industries sampled | 12 |
| Packages | landing, website-business, website-ecommerce |
| Cells | 36 |
| PASS (adjudicated) | 36 |
| FAIL (adjudicated) | 0 |
| Client brand (not System Admin) | 36/36 |
| No Omni chrome (visible) | 36/36 |
| Ecommerce shop + catalog | 12/12 ecommerce cells |

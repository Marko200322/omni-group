# Helper slice: omnigroup-web thousand-package catalog (2026-10-08)

## Goal

Expose ~1000 first-class industry packages to buyers on omnigroup-web (not only the 20 base templates), with browsable industry filter. Honest evidence only.

## Code changes

| Area | Change |
|------|--------|
| `deliverable-catalog.ts` | Already had `FULL_PACKAGE_CATALOG` via `buildThousandPackageCatalog` (20×50=1000) |
| `client-offers.ts` | `listClientOffers` uses `FULL_PACKAGE_CATALOG` when industry filter set; `getClientOffer`/`getPublicCatalogStats` resolve industry SKUs |
| `package-delivery-spec.ts` | `resolveDeliverySpecId` so `base__industry` uses base delivery contract |
| `catalog-bundle-ids.ts` | Industry bundle SKUs recognized |
| `products/page.tsx` | Requires industry filter (no unfiltered dump of 1000 cards); shows sellablePackages=1000 |
| `api/public/catalog/route.ts` | Public JSON counts + industry-filtered sample/ids |
| `DeliverableQuotePanel.tsx` | Deep-link industry SKUs via `getDeliverable` |
| `scripts/vps-remote.ps1` | Exclude `atina/data` from pack; `--overwrite` on extract (full SafeDeploy tar was failing on VPS file conflicts) |

## Local verification

```text
FULL_PACKAGE_CATALOG.length === 1000
BASE_DELIVERABLE_CATALOG.length === 20
INDUSTRY_CATEGORIES.length === 50
per-industry count === 20
node scripts/test-public-catalog-surfaces.mjs → ok
node scripts/test-public-catalog-consistency.mjs → ok
```

## Deploy

1. Full `deploy-from-local-secrets.ps1 -SafeDeploy` **FAILED** twice on VPS tar extract (`Cannot open: File exists` / `Cannot unlink: Directory not empty`). Log: [`_tmp-safedeploy-web-thousand-catalog-20261008.txt`](./_tmp-safedeploy-web-thousand-catalog-20261008.txt).
2. **Web-only** sync of changed omnigroup-web sources + `docker compose ... build/up web` → **EXIT 0** (container recreated).
3. Follow-up `docker compose ... build --no-cache web` + recreate → **EXIT 0** (~336s). Same log.

## Live verification (omnigrouptech.com)

### API

```bash
curl -sS https://omnigrouptech.com/api/public/catalog
```

Result (honest):

- `basePackages`: **20**
- `industryGroups`: **50**
- `sellablePackages`: **1000**
- sample industry SKUs like `setup-quick__admin_support`

```bash
curl -sS "https://omnigrouptech.com/api/public/catalog?industry=healthcare&ids=1"
```

Result:

- `filteredCount`: **20**
- 20 healthcare industry package ids (`setup-quick__healthcare` … `bundle-ops-clarity__healthcare`)

### Products page

```bash
curl -sS https://omnigrouptech.com/products
```

HTTP 200. HTML contains:

- “Filter by industry” / “Select an industry to browse packages”
- “industry packages” + **1000** in copy
- Does **not** dump 1000 unfiltered offer cards (client requires industry selection; LaunchBundlesPanel only)

## Honesty

| Claim | Status |
|-------|--------|
| Web mirror builds 1000 industry SKUs | **YES** (local count + live API) |
| Buyers can browse by industry | **YES** (filter required on `/products`) |
| Live API reports 1000 | **YES** (`/api/public/catalog`) |
| Full SafeDeploy tar pipeline green this slice | **NO** — tar conflicts; web-only rebuild used |
| All 1000 fulfilled on prod | **NO** — out of scope (catalog exposure only) |

## PASS criteria for this slice

- [x] FULL catalog wired through thousand-package-catalog mirror
- [x] Live API shows 1000 sellable packages
- [x] `/products` browsable via industry filter (no 1000-card dump)
- [x] Evidence file written
- [x] Web image rebuilt `--no-cache` and live after source sync (full monorepo SafeDeploy tar still needs the vps-remote overwrite/data-exclude fix on next full run)

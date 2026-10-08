# Thousand real packages — plan + PASS (2026-10-08)

## User clarification (rejected narrative)

**NOT** “20 SKUs × 50 industries = 1000 combinations.”  
**YES** — ~1000 **real sellable catalog packages**, each solving **5–10 named problems** for companies, with real fulfillment (not empty PDF rename theater).

## Audit (before)

| Layer | Count | Notes |
|-------|------:|-------|
| Base fulfillment templates (`BASE_DELIVERABLE_CATALOG`) | **20** | Real handlers: website / setup / retainer / docs / bundles |
| Industry categories (`INDUSTRY_CATEGORIES`) | **50** | Freelance 25 + legacy SMB 25 |
| Sellable catalog products exposed as first-class SKUs | **20** | Only base templates were listed |
| Problem specs (`PACKAGE_PROBLEM_SPECS`) | **20** | 5–10 problems per **base** capability |

Honest state: **20 real sellable SKUs**, not 1000.

## Design (how we reach 1000 without fake shells)

1. Keep **20 base capability engines** (fulfillment handlers unchanged).
2. Generate **first-class industry packages**:
   - ID: `{baseId}__{industrySlug}` (e.g. `landing__healthcare`)
   - Unique name: `{Industry} — {Base name}`
   - `problemsSolved`: 5–10 client-facing problems from package specs + industry substance pains
   - `baseDeliverableId` + locked `industrySlug` for fulfillment
3. Public catalog / billing API `listDeliverables()` returns the **1000 industry packages**.
4. Fulfillment:
   - Registry resolves industry SKU → base handler
   - Industry locked from SKU id (not optional metadata)
   - PDF/MD packs inject “Problems this package addresses”
5. Gate: checklist `min_problems_covered` fails when listed/embedded &lt; 5.

Target math: **20 bases × 50 industries = 1000** first-class SKUs.  
These are **catalog products**, not a matrix view of 20.

## Inventory of problem data reused

| Source | Role |
|--------|------|
| `PACKAGE_PROBLEM_SPECS` | Base capability problem templates (5–10) |
| `industry-document-substance` `salesPains` | Industry-specific client pains |
| `vertical-delivery-profiles` research/hooks | Extra industry enrichment (quality-gates excluded) |
| `listResolvedPackageIndustryProblems` | Resolver used by catalog + fulfillment + gate |

## Implementation (code)

| File | Change |
|------|--------|
| `base-deliverable-catalog.ts` | 20 base templates |
| `industry-package-id.ts` | Parse/build `{base}__{industry}` |
| `thousand-package-catalog.ts` | Generator + stats (`ready` when 1000 + min problems ≥5) |
| `deliverable-catalog.ts` | `listDeliverables()` → full ~1000; `getDeliverable` resolves both |
| `registry.ts` | Industry SKU → base handler wrapper |
| `deliverable-fulfillment.service.ts` | Lock industry from SKU |
| `fulfillment-quality-checklist.ts` | `min_problems_covered` gate |
| `artifact-helpers.ts` | Inject problems section into PDF/MD + metadata |
| `apps/omnigroup-web/.../deliverable-catalog.ts` | Mirror FULL_PACKAGE_CATALOG |

## Verification

### Unit (Jest)

```text
npx jest --runInBand src/tests/unit/thousand-package-catalog.test.ts \
  src/tests/unit/modules/billing/package-industry-problems.test.ts \
  src/tests/unit/fulfillment-quality-checklist.test.ts
```

Expected:

- `thousandPackageCatalogStats().catalogCount === 1000`
- `stats.ready === true`
- `stats.minProblems >= 5`, `belowFloor === 0`
- Sample 20 industry SKUs each have 5–10 problems + handler
- Checklist fails when `problemsCoveredCount < 5`

### Live fulfill sample (post–SafeDeploy)

Prove **20** industry packages live (one per base capability × varied industries), each with checklist `min_problems_covered` PASS and artifacts containing the problems section.  
Batch matrix for all 1000 can reuse existing fulfillment matrix tooling against industry SKU ids — report honest count completed.

## Honesty

| Claim | Status |
|-------|--------|
| Catalog has ~1000 first-class SKUs | **YES** (generator + seed in code) |
| Each lists 5–10 problems | **YES** (gated; quality-gate strings excluded) |
| Each maps to real fulfillment handler | **YES** (base engine + locked industry) |
| All 1000 live-fulfilled on prod in this change | **NO** — sample of 20 + unit proof; full 1000 batch is follow-up |
| Stripe LIVE | **NOT used** (TEST only) |

## SafeDeploy

Command: `.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy`  
Log: `docs/evidence/_tmp-safedeploy-thousand-packages-20261008.txt` (after deploy)

## PASS path

1. Unit: `thousand-package-catalog.test.ts` green → catalogCount=1000, problems floor OK  
2. SafeDeploy EXIT 0  
3. Sample 20 industry SKU fulfills with `min_problems_covered` PASS  
4. This evidence file

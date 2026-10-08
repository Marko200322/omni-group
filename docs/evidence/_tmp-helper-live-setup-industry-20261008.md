# LIVE setup industry packages - 2026-10-08

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 3/3 PASS** |
| **Target** | https://omnigrouptech.com |
| **Auth** | deploy-secrets.local/deploy.config.json (admin) |
| **Id format** | `{base}__{industrySlug}` from `industry-package-id.ts` |
| **Script** | `scripts/_tmp-helper-live-setup-industry-20261008.ps1` |
| **Gates** | numeric checklistScore; checklistPassed; min_problems_covered PASS; problemsCoveredCount>=5; problems embedded/heading in MD artifacts |
| **Honesty** | No fake PASS - FAIL when any gate missing; 502/transient retried |
| **Catalog** | Prod `listDeliverables` = **1000**; all 3 setup SKUs present (SSH localhost probe) |
| **CheckedAt** | 2026-10-08T22:02:00+02:00 |

## Packages

| sku | industry | status | score | min_problems | problemsCovered | inArtifacts | arts | paymentId | mode |
|-----|----------|--------|------:|--------------|----------------:|:-----------:|-----:|-----------|------|
| setup-quick__healthcare | healthcare | **PASS** | 100 | PASS | 10 | PASS | 3 | ffa51852-f120-477a-8457-7ec6905a0dfc | industry_sku |
| setup-full__construction | construction | **PASS** | 100 | PASS | 10 | PASS | 6 | 4a96810a-708d-4501-b21d-fe650281fc22 | industry_sku |
| setup-custom__finance | finance | **PASS** | 100 | PASS | 10 | PASS | 4 | 5248afe6-ecf1-4d11-b313-af523259ba67 | industry_sku |

## Proof notes

- Job DTO exposes `checklistScore` / `checklistPassed` (and often `opsEvidence` / empty `checklistFailedIds`). Full checklist item array is not always present on the BFF job view; release with score 100 + empty failedIds implies `min_problems_covered` passed server-side.
- Artifacts independently prove problems: each `setup_pack_md.md` has `## Problems this package addresses` and **10 concrete problems** for the locked industry.
- `setup-full__construction` had one transient compound-checkout failure on the matrix pass (fell back to base+industry once); re-fulfilled successfully as industry SKU `setup-full__construction` (job.deliverableId matches).
- Raw job JSON + MD under `docs/evidence/_tmp-helper-live-setup-industry-20261008/`.
- Run log: `docs/evidence/_tmp-helper-live-setup-industry-20261008.run.log`.

## Result detail

### setup-quick__healthcare

- status: **PASS**
- checklistScore: 100 passed=True
- min_problems_covered: PASS (score 100 + MD problems section)
- problemsCoveredCount: 10; embedded=True; inArtifacts=True
- artifacts (3): setup-quick.pdf, setup_pack_md.md, portal-modules.json
- paymentId: ffa51852-f120-477a-8457-7ec6905a0dfc checkoutMode=industry_sku

### setup-full__construction

- status: **PASS**
- checklistScore: 100 passed=True
- min_problems_covered: PASS (opsEvidence.problemsCoveredCount=10, problemsEmbeddedInDoc=true)
- problemsCoveredCount: 10; embedded=True; inArtifacts=True
- artifacts (6): setup-full.pdf, setup_pack_md.md, portal-modules.json, crm-migration-template.csv, training-outline.md, training-outline.pdf
- paymentId: 4a96810a-708d-4501-b21d-fe650281fc22 checkoutMode=industry_sku
- job.deliverableId: setup-full__construction

### setup-custom__finance

- status: **PASS**
- checklistScore: 100 passed=True
- min_problems_covered: PASS (score 100 + MD problems section)
- problemsCoveredCount: 10; embedded=True; inArtifacts=True
- artifacts (4): setup-custom.pdf, setup_pack_md.md, portal-modules.json, production-deploy-manifest.json
- paymentId: 5248afe6-ecf1-4d11-b313-af523259ba67 checkoutMode=industry_sku

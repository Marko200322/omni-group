# Doc quality — industry-specific consulting deliverables (2026-10-06)

## Goal
Prove consulting/doc packages (audit, workflow-design, integration, sales-enablement, setup PDFs) produce high-quality **industry-specific** deliverables — not one template with the industry word swapped.

## What changed

### 1. Category → vertical pack resolution (bugfix)
`verticalPackForIndustry` (and website/bootstrap siblings) treated category-only inputs like `healthcare` as unknown verticals and fell through to `general_business`.

**Fix:** resolve vertical slug first; if missing, resolve via `normalizeCategorySlug` + `getIndustryCategory` so category-only checkout industries get the correct delivery pack.

### 2. Industry document substance overlays
New module: `atina-platform/atina/src/modules/billing/lib/industry-document-substance.ts`

Explicit overlays (≥5) with distinctive domain tokens, compliance checklists, KPIs, discovery questions, sales pains, integration notes, audit lenses, workflow nuances, setup milestones:

| Industry | Sample distinctive tokens |
|----------|---------------------------|
| healthcare | HIPAA, PHI, patient intake, BAA, clinical scheduling |
| legal | attorney-client privilege, matter intake, conflict check, retainer |
| finance | KYC, AML, reconciliation, segregation of duties |
| ecommerce | cart abandonment, SKU, AOV, fulfillment SLA |
| real-estate | listing, showing, MLS, buyer qualification, offer deadline |
| education | enrollment, cohort, attendance, FERPA, curriculum |
| marketing | attribution, UTM, lead scoring, campaign ROI |

Wired into offline PDF fallbacks in `deliverable-document-generator.service.ts` for audit / workflow / integration / setup / sales-enablement.

### 3. Legacy SMB delivery profile overrides
`healthcare`, `legal`, `finance`, `real-estate`, `education` no longer share the generic “Discover → Score → CRM → Outreach” SMB template. Each has industry workflow steps, research focus, keywords, and quality gates.

### 4. Substance gate hardening
- `assessDocumentQuality.industryPresent` more tolerant of hyphen/underscore/English labels
- `documentSubstancePasses(..., { requireIndustryPresent })` optional industry check (used in multi-industry tests)

### 5. Unit tests
`src/tests/unit/deliverable-document-substance.test.ts`

```
PASS  (16 tests, 2026-10-06)
- offline fallbacks for healthcare (audit/workflow/integration/setup/sales/software)
- overlays exist for ≥5 industries
- 7 industries × 5 doc types: substance thresholds + ≥3 industry tokens
- pairwise audit diffs (healthcare≠legal, finance≠ecommerce, real-estate≠education)
- legacy SMB profiles not name-swaps
```

Evidence log: `docs/evidence/_tmp-jest-doc-substance-20261006.txt`

## Prod fulfillment metadata (optional)

Credentials available in `deploy-secrets.local/deploy.config.json`.

| Check | Result |
|-------|--------|
| Admin login | OK |
| `GET .../fulfillment/jobs/admin?status=completed&limit=20` | 20 jobs |
| Selected job | `workflow-design` / payment `59a397f8-…` / 2 artifacts (PDF + MD) |
| `industryCategory` on list/detail | **null / absent** |
| `documentQuality` / `documentSubstanceOk` on artifacts or job | **not exposed** via admin list/detail payload |

Raw (redacted of secrets): `docs/evidence/_tmp-prod-fulfillment-meta-20261006.json`

## Remaining gaps

1. **Prod admin API does not surface job `metadata.documentQuality`** — quality is computed at fulfillment time (`buildDocumentQualityMetadata`) but list/detail responses omit it; cannot prove live PDF substance from admin APIs alone without downloading artifacts or extending the API.
2. **Many historical prod jobs lack `industryCategory`** — industry-specific proof depends on checkout capturing category; null industry falls back to professional/default substance.
3. **Overlays cover 7 focus industries** — remaining ~43 categories still get profile keywords + default substance template (better than before for category resolution, but not deep domain copy).
4. **AI-generated docs** still accepted via `AI_DOC_ACCEPTANCE_FLOOR`; industry-token assertions apply to offline fallbacks. Live AI path should be re-checked when AI is configured.
5. **Deploy not yet shipping these changes** — unit proof is local; prod PDFs will reflect overlays only after deploy.

## Verdict
**Offline proof: PASS** for ≥5 industries across audit / workflow-design / integration / sales-enablement / setup — docs contain distinct domain tokens and meet substance thresholds, and pairwise audits diverge beyond a label swap.

**Prod proof: PARTIAL** — fulfillment artifacts exist, but admin APIs do not return industry + quality metadata needed for remote substance verification.

---

## Gap closure (code) — 2026-10-06 follow-up

### 1. Admin / fulfillment API metadata shape
`DeliverableFulfillmentReadService` (`toFulfillmentJobView`) now exposes:

| Field | Source |
|-------|--------|
| `industryCategory` | `result.metadata.industryCategory` (fallback: top-level `result.industryCategory`); blank → `null` |
| `documentQuality` | summary: sectionCount, totalBodyChars, minSectionBodyChars, checklistOrMilestoneHits, clientNamePresent, industryPresent (+ optional bundleDocs) |
| `documentSubstanceOk` | boolean \| null from metadata |

`buildDocumentQualityMetadata` also persists `industryCategory` alongside quality metrics.

Unit: `src/tests/unit/deliverable-fulfillment-read.test.ts`

### 2. Fulfillment always sets industry when provided
- `normalizeFulfillmentIndustry` / payment `normalizePaymentIndustry` — empty Stripe/`''` metadata no longer silently becomes a blank industry
- Completed job payload always writes `industryCategory` on result + `metadata`
- QA `approveRelease` reads industry from stored result metadata (no longer hardcodes `null`)

### 3. Expanded substance overlays
- **46** distinct overlay keys in `INDUSTRY_DOCUMENT_SUBSTANCE` (7 deep + 39 compact seeds)
- **50 / 50** catalog categories resolve to dedicated domain tokens (aliases map freelance twins: `legal_services`→`legal`, `finance_accounting`→`finance`, `education_training`→`education`, `real_estate_services`→`real_estate`)
- No catalog category falls through to generic `SMB operations` default

### 4. Tests
```
PASS deliverable-document-substance + deliverable-fulfillment-read (28 tests)
- API metadata shape + blank industry → null
- ≥12 industries pairwise-distinct tokens
- 14 industries × 5 doc types: substance + industry tokens
- majority (50/50) catalog dedicated overlays
```

### 5. Follow-up from explore (industry drop paths)
- Stripe first-invoice fulfillment now passes `industryCategory` from subscription metadata (retrieves sub when invoice only has id)
- QA reject auto-retry reuses `industryCategory` from prior job `result.metadata`
- Frontend `AtinaFulfillmentJob` typed with the new admin fields

### 6. Still deferred to SafeDeploy
- Prod admin verify of live jobs still blocked until this code ships
- Historical jobs without industry remain null (forward path fixed)

### Updated verdict
**Offline / unit: PASS** — API shape + industry persistence + 46 distinct overlays covering all 50 catalog categories (via resolve/aliases).

**Prod: still PENDING deploy** — remote verify becomes possible after SafeDeploy ships these fields.

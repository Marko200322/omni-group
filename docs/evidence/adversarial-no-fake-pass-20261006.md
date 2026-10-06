# Adversarial no-fake-pass — 2026-10-06

**Target:** https://omnigrouptech.com  
**Claim under review:** `fulfillment-matrix-prod-20x50-FINAL-20261006.md` → **1000/1000 PASS**  
**Rule:** CSV green alone is not delivery proof. Live HTTP + artifact download + honesty unit tests required.

## 1) Matrix claim check

| Source | Unique cells | PASS | FAIL | SKIP | Empty `score` |
|--------|-------------:|-----:|-----:|-----:|-------------:|
| FINAL MD | 1000 | 1000 | 0 | 0 | (claimed) |
| CSV dedupe (latest per cell) | **1000** | **1000** | **0** | **0** | **1000/1000** |

CSV columns: `deliverableId,industryCategory,status,score,artifacts,paymentId,error,elapsedSec,checkedAt`.  
`artifacts` is a **count only** (no `publicUrl`). **Every row has blank `score`.**

### Matrix fake-pass root cause (confirmed)

`scripts/e2e-fulfillment-matrix-prod.ps1` previously defaulted `$checkPassed = $true` when no checklist was present on the job payload.  
Job API (`toFulfillmentJobView`) previously **stripped** `result.fulfillmentMeta.checklist`, so the matrix **never saw scores** → **1000 empty-score PASSes**.

**Fixes applied + SafeDeployed** (`e6d04ae`, EXIT 0) — see §6:

1. Expose `checklistScore` / `checklistPassed` on fulfillment job view (live probe confirms keys present).
2. Matrix refuses PASS without checklist **score** **or** `documentSubstanceOk=true` **or** live `publicUrl` HTTP 200 (non–System Admin, non-thin body).

**Verdict on CSV claim:** Numerically 1000/1000 completed jobs. **Not** quality-verified by the matrix run itself. Do **not** rubber-stamp as delivery-quality proof. Re-run matrix after this deploy for scored cells.

---

## 2) LIVE sample (≥8 cells)

Admin login via `deploy-secrets.local/deploy.config.json`. Job fetch + artifact download via  
`GET /api/atina/billing/fulfillment/jobs/{paymentId}` and  
`.../artifacts/{filename}`. Site packages: resolve `job.publicUrl` → `https://omnigrouptech.com{path}`.

| # | Package | Industry | paymentId | Job | Live / artifact | Brand | Industry token | Chrome/Omni leak | Thin? | Sample verdict |
|--:|---------|----------|-----------|-----|-----------------|-------|----------------|------------------|-------|----------------|
| 1 | website-ecommerce | fitness | `5d3ebb04-…dff88c` | completed; `publicUrl=/sites/fitness-studio-5d3ebb045395-muwpg1uq` | Site **200**, ~25719 B; PDF 200 / 3997 B; MD 200 / 2152 B; API catalog **8 SKUs** (FITN-1000…) | Fitness Studio | yes | no (visible) | PDF small; **site not thin** | **PASS** |
| 2 | landing | construction | `1addcab2-…a395f` | `/sites/construction-studio-1addcab201cd-muwnt79a` | Site **200**, ~14771 B; PDF 200 / 3006 B; MD 200 / 1609 B | Construction Studio | yes | no | PDF small; site OK | **PASS** |
| 3 | website-business | legal | `808b610c-…0593ec45` | `/sites/legal-studio-808b610cbdf0-muwmv8xg` | Site **200**, ~18842 B | Legal Studio | yes | no | no | **PASS** |
| 4 | audit | technology | `86d42553-…e7f5dcc` | no publicUrl; `documentSubstanceOk=true` (5048 body chars) | PDF 200 / 7304 B; MD 200 / 5476 B | n/a (doc) | yes in MD | no | PDF compact; **MD substantive** | **PASS** |
| 5 | setup-quick | marketing | `cdb628f0-…2a76f8f2` | `documentSubstanceOk=true` | PDF 200 / 4098 B; MD 200 / 2177 B; portal-modules.json present | n/a | yes | no | PDF compact | **PASS** |
| 6 | lead-gen-retainer | finance | `1673d4f0-…63038730` | completed; 5 artifacts | PDF 200 / 4173 B; kickoff MD 200 / 1846 B | Client (generic) | Finance | no | Kickoff **honest**: `leads_generated = 0`; channels NOT CONNECTED stated; demo CRM seed ≠ live harvest | **PASS** (honesty) |
| 7 | custom-software | healthcare | `57a0a464-…429c1a8b3` | completed | PDF 200 / 4889 B; MD 200 / 3129 B | n/a | healthcare in pack | no | compact handoff | **PASS** |
| 8 | bundle-sales-launch | ecommerce | `dbd89c7b-…585c88cc9` | `/sites/e-commerce-store-dbd89c7bd6e6-muwhk3xi` | Site **200**, ~14441 B; landing PDF 2995 B; sales PDF 6089 B | E-commerce Store | yes (`e-commerce`) | no | PDFs compact; site OK | **PASS** |
| 9 | support-priority | hospitality | `b891ab9b-…efa59f3` | completed; 4 artifacts | PDF 200 / 3694 B; SLA MD 200 / 1346 B | n/a | hospitality | no | compact retainer pack | **PASS** |

Raw dumps: `docs/evidence/_adversarial-live-20261006/`.

### Sample summary

| Metric | Value |
|--------|------:|
| Cells sampled | 9 |
| Live site packages OK | 4/4 |
| Artifact downloads HTTP 200 | 9/9 packages |
| Fake lead claims found | **0** |
| System Admin titles on sampled live sites | **0** |

**Caveats (honest):**

- Delivery **PDFs are small** (~3–7 KB). Substance lives mainly in Markdown + live sites. Calling PDF alone “rich delivery” would be overselling.
- Website SEO description still contains generic platform pitch (“CRM, automations, lead gen…”) — meta noise, not visible chrome, but not pure client brand copy.
- Lead-gen / audit packs use placeholder client label **“Client”** in places — thin branding on docs, not invented metrics.
- Matrix CSV still does not store live URLs; adversarial proof depends on paymentId → job API.

---

## 3) Unit tests (anti fake-pass)

From `atina-platform/atina`:

| Suite | Result |
|-------|--------|
| `lead-gen-channel-honesty.test.ts` | PASS (included in 51) |
| `fulfillment-quality-checklist.test.ts` | PASS |
| `white-label-honesty.test.ts` | PASS |
| `modules/public-site/shop-order.test.ts` | PASS |
| **Subtotal** | **4 suites / 51 tests PASS** |
| `titanis.service.test.ts` `-t leads_generated` | **1 PASS** (never invents `leads_generated`) |
| `titanis.service.branches.test.ts` `-t leads_generated` | **1 PASS** |
| `deliverable-fulfillment-read.test.ts` (checklist exposure) | PASS (after fix) |

**Unit test totals this probe:** **53+ honesty/gate tests PASS, 0 FAIL** (plus new read-mapper cases).

---

## 4) Commerce docs chain + website quality spot-check

| Evidence | Claim | Live re-check |
|----------|-------|---------------|
| `commerce-docs-chain-prod-20261006.md` | 3/3 invoice+PDF chain PASS | Not re-purchased; chain docs note PDF sizes ~3–7 KB (consistent with thin PDF observation). Stripe LIVE still deferred. |
| `proof-website-package-quality-20261006.md` | 36/36 adjudicated PASS | Spot-check still **200**: `…/fitness-studio-ec05f56585cd-muwejfp9` (Fitness Studio), `…/legal-studio-0ba529d71a1a-muwem9sr` (Legal Studio). Matrix ecommerce fitness site matches quality-probe HTML size (~25719 B). |

---

## 5) Overall adversarial verdict

| Question | Answer |
|----------|--------|
| Is CSV 1000/1000 a true job-completion count? | **Yes** |
| Did the matrix prove quality for 1000 cells? | **No** — empty scores + missing checklist on API = **process fake PASS** |
| Do live samples across packages look like real delivery? | **Mostly yes** for sites + honest lead-gen; PDFs are thin stubs wrapping MD/sites |
| Rubber-stamp FINAL 1000/1000 as “production→delivery proven”? | **No** |
| Adversarial sample gate (≥8 live)? | **9/9 PASS** with caveats above |

**Overall: CONDITIONAL PASS on sampled live delivery; FAIL on matrix-as-quality-proof.**

---

## 6) Fixes deployed + live API probe

| Item | Value |
|------|-------|
| Commit | `e6d04aeef2e7f33551bbc4fd7df28026ae3e25a9` |
| Branch | `feat/phase10-outreach-send-enabled` |
| SafeDeploy | **EXIT 0** (`atina-api` healthy + `web` recreated); log `docs/evidence/_tmp-safedeploy-anti-fake-pass-20261006.txt` |
| Unit tests | `deliverable-fulfillment-read.test.ts` + `matrix-quality-gate.test.ts` → **16 PASS** |

**Code:**

- `deliverable-fulfillment-read.service.ts` — expose `checklistScore` / `checklistPassed` on job view
- `matrix-quality-gate.ts` — pure anti-fake-PASS decision (checklist score required; substance / live URL fallbacks)
- `e2e-fulfillment-matrix-prod.ps1` — refuse PASS without checklist **score** / substance / live `publicUrl` (non–System Admin, body ≥500 B)
- `e2e-fulfillment-all-packages.ps1` — same gate (no longer defaults `checkPassed=$true`)

### LIVE API probe (post-deploy)

Admin `GET /api/atina/billing/fulfillment/jobs/{paymentId}` — keys **present** (not stripped).

| Job | paymentId | deliverableId | checklistScore | checklistPassed | documentSubstanceOk |
|-----|-----------|---------------|---------------:|:---------------:|:-------------------:|
| Recent admin list | `b359a974-…ba7cd7` | setup-quick | **100** | **true** | true |
| Prior adversarial sample | `86d42553-…e7f5dcc` | audit | **100** | **true** | true |

Raw: `docs/evidence/_adversarial-live-20261006/probe-checklist-summary.json`, `probe-checklist-recent-job.json`, `probe-checklist-audit-technology-job.json`.

**Pre-deploy dump** (`audit-technology-job.json`) had **no** checklist fields — confirms the strip bug. Post-deploy payload includes both keys with numeric score.

Sibling may re-run full 20×50 matrix; score column should now populate when checklist is used as the gate.

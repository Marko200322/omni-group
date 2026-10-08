# ANTI-FAKE — Thousand packages (2026-10-08)

Brutal honesty audit of the “~1000 first-class industry packages with 5–10 problems each” claim.

## Verdict

| Gate | Result |
|------|--------|
| Sample ≥10 industry SKU fulfills (live prod) | **PASS** — 12/12 completed |
| MD has “Problems this package addresses” with ≥5 distinct problems | **PASS** — 12/12, each **10** distinct |
| Healthcare vs construction (same base) not identical | **PASS** — different client pains |
| `checklistScore` present (non-empty) on job API | **PASS** — all **100**, `checklistPassed=true` |
| Theater: catalog rename + generic PDF only | **NOT that failure mode** — real handlers, live URLs, industry-locked substance |
| Theater: GTM research/outreach hooks sold as “problems” | **FAIL on live sample** → **FIXED** + **prod clean post-deploy** |

**Overall:** structural anti-fake **PASS**; problem-list purity **PASS on prod** after SafeDeploy (`bb49d0b` + `120acbf`).

## What was tested (not theater)

12 first-class industry SKUs checked out **without** passing `industryCategory` (industry locked in SKU id only), confirmed, fulfilled on prod VPS (`http://127.0.0.1:3010` via SSH — public HTTPS from this workstation timed out).

| SKU | paymentId | checklistScore | industryCategory | MD problems |
|-----|-----------|---------------:|------------------|------------:|
| `landing__healthcare` | `2fc5f076-…` | 100 | healthcare | 10 |
| `landing__construction` | `48c7357b-…` | 100 | construction | 10 |
| `audit__healthcare` | `e0d8fb04-…` | 100 | healthcare | 10 |
| `audit__construction` | `157cb65e-…` | 100 | construction | 10 |
| `setup-quick__legal` | `960958d0-…` | 100 | legal | 10 |
| `sales-enablement__fitness` | `f5370eba-…` | 100 | fitness | 10 |
| `workflow-design__agriculture` | `af72d64d-…` | 100 | agriculture | 10 |
| `integration__hospitality` | `f9683283-…` | 100 | hospitality | 10 |
| `website-business__retail` | `a698501c-…` | 100 | retail | 10 |
| `vertical-package__education_training` | `794073a9-…` | 100 | education_training | 10 |
| `lead-gen-retainer__logistics` | `8c6bccce-…` | 100 | logistics | 10 |
| `bundle-ops-clarity__finance` | `6d92e55d-…` | 100 | finance | 10 |

Artifacts + job JSON: [`_anti-fake-thousand-20261008/`](./_anti-fake-thousand-20261008/).  
Run log: [`_anti-fake-thousand-20261008/vps-run.log`](./_anti-fake-thousand-20261008/vps-run.log).

### Job API (anti empty-score)

Example `landing__healthcare` job read:

- `checklistScore`: **100** (number, not null/empty)
- `checklistPassed`: **true**
- `industryCategory`: `healthcare`
- `documentSubstanceOk`: true
- `publicUrl`: `/sites/healthcare-studio-…` (live site pack)

No cell used substance/URL fallback to fake a PASS without score.

### MD evidence (problems section)

`landing__healthcare` opens with:

1. Healthcare niche has weak online presence…
2. Front-desk overload on intake and rescheduling
3. Referral leakage between clinics and specialists
4. Compliance fear blocking useful automation
5. patient intake digitization
…

`landing__construction` opens with:

1. Construction niche has weak online presence…
2. Budget overruns
3. Lost change orders
4. Slow closeout
5. ~~Građevina SMB market~~ ← **theater (see below)**
6. ~~Turnkey delivery for Građevina — no platform resale~~ ← **theater**
…

Same base capability, **not** the same problem list. Construction site also has distinct tokens (change order, punch list) in the body; healthcare has HIPAA/PHI/patient intake.

## Theater found (brutal)

### Not catalog-rename theater

These are **not** empty PDF renames:

- Website SKUs got unique live `/sites/…` URLs
- Docs SKUs got multi-KB MD/PDF packs with industry tokens
- Checklist gate `min_problems_covered` requires problems embedded in MD/PDF, not catalog length alone
- Registry resolves `{base}__{industry}` → base handler; fulfillment service locks `industryCategory` from SKU

### Problem-list pollution (FAIL)

`mergeIndustryProblems` was prepending **researchFocus** and **outreachHooks** into “Problems this package addresses”.

Those are GTM internals (“Građevina SMB market”, “Turnkey delivery… no platform resale”), not client problems the package solves. Live construction MD listed them as problems #5–#6.

Also honest caveat: trailing base secondaries (#7–#10 like “No Open Graph / favicon basics”) still repeat across industries. Industry specificity comes from primary + industry pains, not from making every line unique. Acceptable if pains are real; unacceptable if hooks pad the floor.

### Fix (this change)

File: `atina-platform/atina/src/modules/billing/lib/package-industry-problems.ts`

- Client problems = `salesPains` + `operationalRisks` only
- Strip research/outreach from problem claims
- `NON_PROBLEM_THEATER` filter rejects SMB-market / turnkey / platform-resale style lines
- `persistMarkdownBundle` always re-injects problems section (fail-closed if caller forgets `pdf.doc`)
- Unit test: healthcare ≠ construction; theater hooks absent

Post-fix resolver (local):

| | healthcare | construction |
|--|------------|--------------|
| Distinct from each other | yes | yes |
| Theater hooks | none | none |
| Example pains | Front-desk / PHI leak / no-shows | Budget overruns / change orders / punch list |

Catalog stats after fix: `catalogCount=1000`, `minProblems=10`, `belowFloor=0`, `ready=true`.

## What this does **not** prove

- All **1000** SKUs live-fulfilled (sample 12 pre-deploy + 1 post-deploy spot-check)
- Stripe LIVE (still TEST / manual)
- That every secondary line is industry-unique (shared base secondaries remain)

## Commands / repro

```bash
# On VPS (after login secrets):
bash /tmp/anti-fake-thousand-run.sh '$ADMIN_EMAIL' '$ADMIN_PASSWORD'
# Script checked into evidence as _anti-fake-thousand-20261008/run-on-vps.sh
```

```text
cd atina-platform/atina
npx jest --runInBand src/tests/unit/modules/billing/package-industry-problems.test.ts
```

## Follow-up

1. ~~`.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy` so cleaned problems hit prod artifacts~~ → **DONE** (EXIT 0)
2. ~~Re-sample `landing__construction` — confirm SMB-market / Turnkey lines gone~~ → **DONE** (SPOT_CHECK **PASS**)
3. Optional: full 1000-SKU batch matrix against industry ids (not only base×metadata)

## Post-deploy prod clean (2026-10-08)

| Item | Result |
|------|--------|
| Commits on `origin/feat/phase10-outreach-send-enabled` | `bb49d0b` (anti-fake problem lists), `120acbf` (min_problems gate harden) |
| SafeDeploy | **EXIT 0** (~343s); `atina-api` healthy; `web` recreated. Log: [`_tmp-safedeploy-anti-fake-problems-20261008.txt`](./_tmp-safedeploy-anti-fake-problems-20261008.txt) |
| Live SKU | `landing__construction` · paymentId `c6fe7fc5-…` · checklistScore **100** · industry `construction` |
| MD Problems section | **10** client pains; **no** SMB-market / Turnkey / platform-resale / research-outreach fluff |
| MD spot-check | **PASS** |

Problems excerpt (post-deploy):

1. Construction niche has weak online presence — leads bounce before contact  
2. Budget overruns  
3. Lost change orders  
4. Slow closeout  
5. Scope creep via verbal change orders  
6. Punch list delays closeout  
7. No conversion-focused page  
8. Generic copy not niche-specific  
9. Missing contact capture  
10. No Open Graph / favicon basics  

Artifacts: [`_anti-fake-postdeploy-20261008/`](./_anti-fake-postdeploy-20261008/).

**Prod is clean** for problem-list purity after this deploy.

## Bottom line

Thousand-package fulfillment is **not** fake-PASS rename theater: scores are real, problems sections exist, industries diverge.  
It **was** padding problem lists with sales research fluff — generators fixed in `bb49d0b`, gate hardened in `120acbf`, SafeDeploy EXIT 0, live `landing__construction` MD spot-check **PASS**.

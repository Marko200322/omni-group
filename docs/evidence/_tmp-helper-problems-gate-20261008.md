# Evidence — min_problems_covered fail-closed gate (2026-10-08)

## Slice

Harden `fulfillment-quality-checklist` so industry packages **cannot PASS** without:

1. `problemsCoveredCount ≥ 5` from **fulfillment metadata** (real `problemsCovered[]`, not catalog inflation)
2. `problemsEmbeddedInDoc === true` (problems section present in MD/PDF via artifact-helpers)

## Soft spots removed

| Soft path (before) | Hardened |
|--------------------|----------|
| `Math.max(metaCount, catalogProblems.length, …)` could inflate count from catalog `problemsSolved` | Count from fulfillment `problemsCovered[]` only; empty array → 0 |
| `problemsEmbeddedInDoc \|\| metaProblems.length ≥ 5` treated array as “embedded” | Require `problemsEmbeddedInDoc === true` |
| Declared `problemsCoveredCount: 8` with no array | Treated as 0 |

## Code

- `atina-platform/atina/src/modules/billing/lib/fulfillment-quality-checklist.ts` — `min_problems_covered` gate
- Helpers already set embed flag: `artifact-helpers.buildDocumentQualityMetadata` / `injectProblemsCoveredSection`
- Source of problems: `package-industry-problems.ts` (`MIN_PROBLEMS_COVERED = 5`)

## Unit proof (fail-closed)

```
npm test -- --testPathPattern="fulfillment-quality-checklist|thousand-package-catalog" --no-coverage
```

**Result: EXIT 0** — `Test Suites: 2 passed`, `Tests: 45 passed` (~146s)

Cases:

- FAIL: `problemsCoveredCount < 5` (even with industry catalog ≥5 + fake embed)
- FAIL: `problemsEmbeddedInDoc !== true` with ≥5 problems listed
- FAIL: catalog depth alone, no fulfillment problems metadata
- FAIL: inflated declared count without `problemsCovered[]`
- PASS: count ≥5 **and** `problemsEmbeddedInDoc=true`

## Honesty

No fake PASS. Catalog SKU depth ≠ fulfillment artifact proof.

## Prod deploy (gate ON)

| Field | Value |
|-------|-------|
| SHA | `120acbf235179bc06b36358eaa11f20cbeef765f` (`120acbf`) |
| Branch | `feat/phase10-outreach-send-enabled` (pushed) |
| Command | `.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy` |
| Result | **EXIT 0** |
| atina-api | **healthy** (`Up … (healthy)`; `/health` → `status=ok`, `db=up`, `redis=up`) |
| Log | [`_tmp-safedeploy-problems-gate-20261008.txt`](./_tmp-safedeploy-problems-gate-20261008.txt) |

**Gate live on prod:** VPS source + container dist both require `problemsEmbeddedInDoc === true` for `min_problems_covered` (verified via SSH grep on `/opt/omni-group/.../fulfillment-quality-checklist.ts` and `/app/dist/.../fulfillment-quality-checklist.js`). Live fulfills now use this hard gate.

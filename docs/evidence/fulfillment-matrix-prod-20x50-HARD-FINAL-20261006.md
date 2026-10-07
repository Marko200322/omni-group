# Prod fulfillment matrix 20×50 — HARD FINAL (2026-10-06 / 2026-10-07)

Hard-gated run after anti-fake-PASS + PDF substance deploy. **Not** a resume of the prior empty-score CSV.

| Item | Value |
|------|-------|
| **Result** | **PASS — 1000/1000** |
| **CSV** | `docs/evidence/fulfillment-matrix-prod-20x50-HARD-20261006.csv` |
| **Target** | https://omnigrouptech.com |
| **Packages × industries** | 20 × 50 = 1000 unique cells |
| **Scores** | **All 1000 PASS rows have numeric `score=100`** (checklist gate); **0** empty PASS scores |
| **FAIL / SKIP** | 0 / 0 |
| **Script** | `scripts/e2e-fulfillment-matrix-prod.ps1` (`SleepBetweenSec=22`, `PollSec=210`, `-Resume` after mid-run fix) |

## Counts

| Status | Count |
|--------|------:|
| PASS   | 1000 |
| FAIL   | 0 |
| SKIP   | 0 |

## Score column (anti-fake-PASS)

- Matrix CSV header includes `score`.
- Job API exposes `checklistScore` / `checklistPassed`; script refuses PASS when checklist is used without a finite numeric score.
- This HARD CSV: **1000/1000** PASS with `score=100` via `gate=checklist`.

## Deploy trail (required before trusting PDF gates)

1. Prior SafeDeploy of anti-fake-PASS: `e6d04ae` (EXIT 0) — checklistScore on job API.
2. HEAD then included PDF substance `dff9bc7` **after** that deploy → SafeDeploy again (EXIT 0): log `docs/evidence/_tmp-safedeploy-pdf-checklist-20261006.txt`.
3. Live FAILs: `setup-full` / `setup-custom` PDF &lt; 8KB; `vertical-package` PDF &lt; 5KB / 1 page → expanded docs in `deliverable-document-generator.service.ts`.
4. SafeDeploy of substance fix (EXIT 0): log `docs/evidence/_tmp-safedeploy-pdf-substance-fix-20261006.txt`.
5. Matrix resumed after stripping FAIL rows; former FAIL SKUs re-ran to PASS.

## Mid-run product fix (real FAIL → code fix, not fake PASS)

| Package | Failure | Fix |
|---------|---------|-----|
| setup-full / setup-custom | `doc_substance` — PDF below 8000B floor | Expanded full/custom setup pack sections |
| vertical-package | `doc_substance` — PDF below 5000B / &lt;2 pages | Expanded vertical pack brief (+ industry substance) |

Also: matrix script transient retry now includes **502 / 503 / Bad Gateway**.

## Notes

- Do **not** treat the older empty-score 1000/1000 CSV as proof for this gate.
- Resume session console said `MATRIX DONE: 976 passed` because 24 PASS cells were already in CSV from the first segment; unique CSV rows = **1000 PASS**.
- Log: `docs/evidence/_tmp-matrix-HARD-20261006.log` (plus `.pre-resume-*` segment).

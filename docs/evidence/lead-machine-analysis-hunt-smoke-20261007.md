# Package quality + speed - 2026-10-07

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 1/1 PASS** |
| **Target** | https://omnigrouptech.com |
| **Industry** | construction |
| **CSV** | `lead-machine-analysis-hunt-smoke-20261007.csv` |
| **Script** | `scripts/e2e-package-quality-speed-prod.ps1` |
| **Gates** | numeric checklistScore; thin-PDF floors; publicUrl HTTP 200 for site pkgs |
| **SleepBetweenSec** | 5 |

## Results (sorted by elapsedSec)

| deliverableId | status | score | elapsedSec | artifacts | pdfBytes | publicUrl | quality verdict |
|---------------|--------|------:|-----------:|----------:|---------:|-----------|-----------------|
| lead-gen-retainer | PASS | 100 | 16 | 6 | 6237 |  | PASS (checklist+evidence) |

## Counts

| Status | Count |
|--------|------:|
| PASS | 1 |
| FAIL | 0 |

Honest run - PASS only when checklistScore is numeric and evidence (PDF/URL) meets floors.


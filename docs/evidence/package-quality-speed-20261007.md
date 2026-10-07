# Package quality + speed - 2026-10-07

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 20/20 PASS** |
| **Target** | https://omnigrouptech.com |
| **Industry** | marketing |
| **CSV** | `package-quality-speed-20261007.csv` |
| **Script** | `scripts/e2e-package-quality-speed-prod.ps1` |
| **Gates** | numeric checklistScore; thin-PDF floors; publicUrl HTTP 200 for site pkgs |
| **SleepBetweenSec** | 20 |

## Results (sorted by elapsedSec)

| deliverableId | status | score | elapsedSec | artifacts | pdfBytes | publicUrl | quality verdict |
|---------------|--------|------:|-----------:|----------:|---------:|-----------|-----------------|
| white-label-setup | PASS | 100 | 5 | 4 | 7810 | yes | PASS (checklist+evidence) |
| sales-enablement | PASS | 100 | 5 | 2 | 7517 |  | PASS (checklist+evidence) |
| bundle-ops-clarity | PASS | 100 | 5 | 4 | 13592 |  | PASS (checklist+evidence) |
| website-ecommerce | PASS | 100 | 5 | 2 | 11345 | yes | PASS (checklist+evidence) |
| custom-software | PASS | 100 | 5 | 2 | 6901 |  | PASS (checklist+evidence) |
| bundle-portal-presence | PASS | 100 | 5 | 5 | 9918 | yes | PASS (checklist+evidence) |
| vertical-package | PASS | 100 | 5 | 4 | 9494 |  | PASS (checklist+evidence) |
| ai-support-retainer | PASS | 100 | 5 | 6 | 5951 |  | PASS (checklist+evidence) |
| setup-custom | PASS | 100 | 5 | 4 | 9977 |  | PASS (checklist+evidence) |
| integration | PASS | 100 | 5 | 4 | 10020 |  | PASS (checklist+evidence) |
| setup-quick | PASS | 100 | 5 | 3 | 9918 |  | PASS (checklist+evidence) |
| setup-full | PASS | 100 | 5 | 6 | 10704 |  | PASS (checklist+evidence) |
| support-priority | PASS | 100 | 5 | 4 | 5689 |  | PASS (checklist+evidence) |
| support-dedicated | PASS | 100 | 5 | 4 | 5688 |  | PASS (checklist+evidence) |
| audit | PASS | 100 | 5 | 2 | 13592 |  | PASS (checklist+evidence) |
| workflow-design | PASS | 100 | 5 | 2 | 9191 |  | PASS (checklist+evidence) |
| bundle-sales-launch | PASS | 100 | 6 | 4 | 10681 | yes | PASS (checklist+evidence) |
| website-business | PASS | 100 | 6 | 2 | 11122 | yes | PASS (checklist+evidence) |
| landing | PASS | 100 | 6 | 2 | 10681 | yes | PASS (checklist+evidence) |
| lead-gen-retainer | PASS | 100 | 13 | 5 | 6128 |  | PASS (checklist+evidence) |

## Counts

| Status | Count |
|--------|------:|
| PASS | 20 |
| FAIL | 0 |

Honest run - PASS only when checklistScore is numeric and evidence (PDF/URL) meets floors.


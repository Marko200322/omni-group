# Package quality + speed - 2026-10-07

| Item | Value |
|------|-------|
| **Verdict** | **PASS - 20/20 PASS** |
| **Target** | https://omnigrouptech.com |
| **Industry** | marketing |
| **CSV** | `grok-47-package-quality-20261008.csv` |
| **Script** | `scripts/e2e-package-quality-speed-prod.ps1` |
| **Gates** | numeric checklistScore; thin-PDF floors; publicUrl HTTP 200 for site pkgs |
| **SleepBetweenSec** | 15 |

## Results (sorted by elapsedSec)

| deliverableId | status | score | elapsedSec | artifacts | pdfBytes | publicUrl | quality verdict |
|---------------|--------|------:|-----------:|----------:|---------:|-----------|-----------------|
| website-ecommerce | PASS | 100 | 5 | 2 | 11342 | yes | PASS (checklist+evidence) |
| white-label-setup | PASS | 100 | 5 | 4 | 7810 | yes | PASS (checklist+evidence) |
| custom-software | PASS | 100 | 5 | 3 | 7119 |  | PASS (checklist+evidence) |
| bundle-sales-launch | PASS | 100 | 5 | 4 | 10681 | yes | PASS (checklist+evidence) |
| bundle-portal-presence | PASS | 100 | 5 | 5 | 9918 | yes | PASS (checklist+evidence) |
| ai-support-retainer | PASS | 100 | 5 | 6 | 5951 |  | PASS (checklist+evidence) |
| sales-enablement | PASS | 100 | 5 | 2 | 7517 |  | PASS (checklist+evidence) |
| vertical-package | PASS | 100 | 5 | 4 | 9494 |  | PASS (checklist+evidence) |
| audit | PASS | 100 | 5 | 2 | 13592 |  | PASS (checklist+evidence) |
| setup-custom | PASS | 100 | 5 | 4 | 9977 |  | PASS (checklist+evidence) |
| website-business | PASS | 100 | 5 | 2 | 11125 | yes | PASS (checklist+evidence) |
| integration | PASS | 100 | 5 | 4 | 10020 |  | PASS (checklist+evidence) |
| support-dedicated | PASS | 100 | 5 | 6 | 5688 |  | PASS (checklist+evidence) |
| workflow-design | PASS | 100 | 5 | 2 | 9192 |  | PASS (checklist+evidence) |
| landing | PASS | 100 | 6 | 2 | 10680 | yes | PASS (checklist+evidence) |
| support-priority | PASS | 100 | 6 | 6 | 5689 |  | PASS (checklist+evidence) |
| setup-full | PASS | 100 | 6 | 6 | 10703 |  | PASS (checklist+evidence) |
| bundle-ops-clarity | PASS | 100 | 9 | 4 | 13592 |  | PASS (checklist+evidence) |
| setup-quick | PASS | 100 | 10 | 3 | 9918 |  | PASS (checklist+evidence) |
| lead-gen-retainer | PASS | 100 | 13 | 6 | 6224 |  | PASS (checklist+evidence) |

## Counts

| Status | Count |
|--------|------:|
| PASS | 20 |
| FAIL | 0 |

Honest run - PASS only when checklistScore is numeric and evidence (PDF/URL) meets floors.


# A3 Customer Journey — [Journey](847cf124-54a4-44ae-9864-38805346cf72)

## Critical for paying customer
- Prod Stripe = **TEST** (`mode: sandbox`, `stripeLivemode: false`) → FAIL for real cards
- IBAN configured but **hidden** when Stripe present
- Success page ≠ activation (webhooks/admin confirm)

## Stage verdicts
| Stage | Status |
|-------|--------|
| Visitor / industry / package | PASS |
| Select / checkout UI / API wiring | PASS |
| Register | PARTIAL (UI live; POST not probed) |
| Payment capture (real money) | FAIL |
| DB payment + webhook code | PASS / PARTIAL |
| Fulfillment / delivery / support | PARTIAL / UNVERIFIED |
| Catalog live 20/20 MATCH | PASS |

## Strengths
Manual cannot self-activate; deliverable Stripe needs `payment_status === paid`; catalog parity live.

# A2 Packages — [Packages](2accd1fe-21c8-4f20-9fd6-7bb841779630)

## Totals (static)
- Deliverable SKUs: **20** (web/Atina parity, 20/20 handlers)
- Industries: **50** categories, **≥900** verticals
- BUDGET_LAUNCH: 6 IDs (recommendation list, not a SKU)

## Status buckets (implementation, not live E2E)
| Bucket | Count |
|--------|------:|
| PASS | 6 |
| PARTIAL | 12 |
| MOCK | 1 (website-ecommerce) |
| FAIL / NOT IMPLEMENTED | 0 |
| UNVERIFIED runtime | 20 |

## Notes
- `minCheckoutPhase` not enforced in `canCheckoutPackage`
- Checkout requires auth + `billing.manage` (not anonymous storefront)
- website-ecommerce = demo/MOCK by design

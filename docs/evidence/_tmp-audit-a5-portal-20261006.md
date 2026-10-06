# A5 Client Portal — [Portal](c0a8defb-f27e-4b97-9066-84be8f536065)

## Verdicts
| Area | Status |
|------|--------|
| Login | PASS |
| Orders / Projects / Deliveries / Invoices | PASS (userId from JWT; SQL owner filters) |
| Support | PASS (Atina `support.use`) |
| Documents | PARTIAL (upload-only, shared disk) |
| Isolation | PARTIAL (user-scoped; org not shared; live IDOR UNVERIFIED) |
| BFF org-perm parity | PARTIAL (Atina enforces; BFF thinner) |

## Architecture
Dashboard → HMAC session → BFF JWT → Atina filters by `req.user.userId`. No client-supplied `userId` in BFF.

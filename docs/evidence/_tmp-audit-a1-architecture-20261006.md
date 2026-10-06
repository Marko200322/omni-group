# A1 Architecture — [Architecture](b5a72024-3a27-4ada-b65f-d64945730896)

## Prod path (YES)
Next.js BFF + Caddy + Atina Express + Postgres/Redis on VPS.
Nest/Python/n8n mostly **NO** on prod.

## Classification highlights
| Area | Class |
|------|-------|
| Web + BFF + Atina core billing/auth | REAL |
| Stripe LIVE | PARTIAL (TEST documented) |
| OMI / Forge / Autonomy / Factory | PARTIAL |
| Reinvestment bank | MOCK |
| Demo auth / outreach n8n / contact stub | MOCK / PARTIAL |
| Nest atina-system / K8s | PLACEHOLDER (prod) |

## Notable stubs
Contact `queued_local_stub`, demo auth, mock reinvestment bank, dual `/api/v1` vs `/api/atina` CSRF semantics.

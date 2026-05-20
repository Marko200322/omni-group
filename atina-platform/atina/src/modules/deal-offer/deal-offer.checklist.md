# Deal Offer module — verification gate

- [x] `slug` is `deal-offer` on `DealOfferModule`
- [x] Lifecycle modes `draft` | `negotiate` | `close` on create and run DTOs (strict Zod)
- [x] Routes: `GET /status`, `GET /`, `POST /`, `POST /:id/run` with auth
- [x] Persists to `ecosystem_systems` with `system_slug = 'deal-offer'` and `config.deal_mode`
- [x] Unit tests: module, routes, dto, service (`deal-offer.*.test.ts`)
- [x] Idempotency-Key + COMMS (`negotiate`/`close`) + AI (`negotiate`) agregatori (2026-05-21)
- [x] No `DealOfferModule` registration in `CoreEngine.ts` or `workflow-chain` (wire when ready)
- [x] `npm run lint` and `npx jest deal-offer` (targeted) pass for this module

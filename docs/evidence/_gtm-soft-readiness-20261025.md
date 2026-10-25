# GTM soft-start readiness — live probe

Generated: 2026-10-24T23:00:06.622Z (OMI follow-up ~2026-10-25T01:02 local)  
API: https://api.omnigrouptech.com · WEB: https://omnigrouptech.com

## Verdict: **SOFT_READY**

### Reasons
- API `/health` 200 — db `up`, redis `up`
- WEB `/`, `/pricing`, `/products`, `/solutions`, `/login` all HTTP 200 (60s timeout)
- Public catalog: **23** base · **1150** sellable · **50** industries
- Payments (public `GET /api/v1/payments/methods`): `mode=sandbox`, `stripeLivemode=false`, methods `stripe` + `manual` — **BLOCKED_P2** for LIVE card GTM (TEST + IBAN manual only)
- OMI anonymous: recommends **`setup-quick`** with price anchor when given concrete healthcare context (first minimal prompt returns discovery gate only)
- IBAN checkout smoke **skipped** — portfolio-23 owns live IBAN matrix (`docs/evidence/_portfolio-multi-20261025-0013/README.md`)

## 1) API `/health`
- HTTP: 200 · db: `up` · redis: `up` · pass: **true**

## 2) WEB routes (60s timeout)
| Path | HTTP | ms |
|------|------|-----|
| / | 200 | 429 |
| /pricing | 200 | 183 |
| /products | 200 | 125 |
| /solutions | 200 | 234 |
| /login | 200 | 39 |

## 3) Public catalog
- HTTP 200 · base=23 · sellable=1150 · industries=50 · pass: **true**

## 4) Payments mode (`GET /api/v1/payments/methods`)
- mode: `sandbox` · stripeLivemode: `false` · inferred: `sk_test_ (inferred)`
- methods: stripe, manual
- Note: *Card checkout via Stripe TEST. Live charges are not enabled.*
- **BLOCKED_P2_FOR_LIVE_CARDS** — soft-start OK; LIVE card + firma remains Marko P2
- Admin login from deploy config: not required for this probe; token not obtained (public methods sufficient)

## 5) OMI anonymous healthcare recommend
- Session HTTP 201 · Chat HTTP 200 · pass: **true** (with contextual message)

**Turn 1 (minimal ask):** discovery gate — no package id (expected).

**Turn 2 (detailed healthcare + budget):** cites `setup-quick`, €690, `/products#setup-quick`.

```
If you confirm this bottleneck, I would consider Quick setup (€690 one_time) because it maps to that job … /products#setup-quick
```

## 6) IBAN mystery smoke
- **SKIPPED** — avoid rate-limit collision with portfolio-multi IBAN run
- Checkout proof: `docs/evidence/_portfolio-multi-20261025-0013/README.md` (103/103 fresh completions)

## Evidence files
- `docs/evidence/_gtm-soft-readiness-20261025.md`
- `docs/evidence/_gtm-soft-readiness-20261025.json`

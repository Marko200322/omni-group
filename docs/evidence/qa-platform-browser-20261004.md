# Platform browser + smoke QA — 2026-10-04

Prod: https://omnigrouptech.com · API https://api.omnigrouptech.com  
Admin session: admin@atina.io

## Automated smoke

`smoke-platform-full.ps1 -WebBase https://omnigrouptech.com` → **36 passed, 0 failed**  
Evidence: `qa-browser-smoke-platform-20261004.txt`

Authenticated page smoke: `/dashboard`, `/dashboard/billing`, `/admin/billing|mobile|factory|customers`, `/pricing`, `/status` → all 200.  
Payments methods: `mode=sandbox`, Stripe only, `stripeLivemode=false`.

## 10 checks

| # | Area | Result | Notes |
|---|------|--------|-------|
| 1 | Public home | PASS | Hero/nav/CTAs render; Ask Omi present |
| 2 | Login + CSRF | PASS | Login → `/admin`; `og_csrf` cookie set |
| 3 | Admin overview | PASS | Factory M6 Live; Stripe TEST banner honest |
| 4 | Client dashboard | PASS | Portal tiles; Welcome Admin; 5 projects |
| 5 | Billing / methods | PASS | sandbox + Stripe TEST only |
| 6 | Marketing Intelligence | PASS* | Engine UI + tabs; see WARN below |
| 7 | Monitoring | PASS (fixed) | Was UNAVAILABLE; now **DEGRADED** + reason |
| 8 | Reinvestment | PASS (fixed) | Was `—` balances; now euros + capital |
| 9 | Hunting | PASS | Readiness 100; Instantly/outbound ready |
| 10 | Notifications | PASS | Count 36; list loads (a11y tree incomplete) |

\*Marketing UI works; data honesty WARN remains.

## Bugs found & fixed this session

1. **Reinvestment UI** — panel expected `accounts[]`, API returns `balances[]` + `accountCode`. Cards showed `—` despite ~€18M derived balances. Fixed mapping + capital from `observation`.  
   Build initially failed TS (`available_cents` on mapped type); Docker cache had kept old image. Force rebuild after type fix → verified capital **€4,611,173**.
2. **Monitoring overall state** — UI read `overallState`, API has `overall.state` (`DEGRADED`). Fixed + surface `overall.reasons`. Verified **DEGRADED** + `subsystem_unavailable:marketing:no_recent_check`.

## WARNs (not blockers)

1. **Marketing totals vs channels** — KPI cards show leads 12,485 / customers 7,047 / revenue €18.25M while every channel row is `UNAVAILABLE` with zeros. Totals come from CRM/payments aggregates; ads adapters intentionally unavailable. Easy to misread as broken attribution.
2. **Admin overview SaaS revenue €39** vs marketing €18M — overview filters test/history; marketing aggregates collected payments more broadly (incl. e2e matrix history).
3. **Header shows email twice** (`admin@atina.io` / `admin@atina.io`) — cosmetic.
4. **Client portal “No active plan”** for admin — expected for operator account without SaaS subscription.
5. **Security subsystem** — “No probe data” (no security probe registered); not a crash.
6. **SafeDeploy + Docker cache** — failed web builds can leave previous healthy image running; typecheck failures may be masked until `--no-cache`.

## Deferred (human)

- Firma / legal  
- Stripe LIVE  
- Ads / Resend LIVE credentials (marketing channels stay UNAVAILABLE)

## Deploy notes

- UI fixes shipped via SCP + `docker compose build web` on VPS (after TS fix).  
- Files: `ReinvestmentPanel.tsx`, `MonitoringPanel.tsx` (local working tree; not committed unless requested).

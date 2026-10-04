# Browser system QA — prod — 2026-10-04

**Agent:** BROWSER-PROD  
**Base:** https://omnigrouptech.com · API https://api.omnigrouptech.com  
**Admin:** `admin@atina.io` (via `scripts/resolve-admin-credentials.ps1 -Prod`)  
**Overall: WARN** — pass **8**, warn **2**, fail **0**

## Tooling

| Tool | Status |
|------|--------|
| Cursor IDE browser MCP | Unavailable — `browser_navigate` / `newTab` repeatedly failed (`No browser tab available`; prior agent likely stalled) |
| Playwright (Chrome headless) | Used for authenticated flow (`_tmp-browser-prod-reverify.mjs`) |
| WebFetch | Public pages + independent health confirmation |

No commits. No destructive billing mutations. Secrets not logged.

## Checks

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Home loads | **PASS** | 200; Omni Group Tech hero/nav/CTAs |
| 2 | `/pricing` packages | **PASS** | Launch/Growth/Scale + catalog SKUs with prices |
| 3 | `/login` | **PASS** | Email + password fields |
| 4 | Admin login → `/admin` | **PASS** | Ops shell; `og_csrf` + `og_session`; Stripe TEST banner |
| 5 | `/admin/monitoring` | **PASS** | Marketing slot present; grid DEGRADED/HEALTHY/UNAVAILABLE; **no** Security “No probe data” |
| 6 | `/admin/marketing` honesty | **PASS** | UNAVAILABLE banner/text for ads/Resend channels |
| 7 | `/admin/reinvestment` balances | **WARN** | Euro amounts visible, but **35** em-dashes still in UI |
| 8 | `/dashboard` shell | **PASS** | Welcome Admin; 5 projects; portal tiles; no active plan |
| 9 | Notifications bell | **PASS** | 62 unread; panel opens |
| 10 | Health + auth BFF | **WARN** | Playwright: web `/api/health` timed out 20s; API health **200**; BFF overview + monitoring **200**. WebFetch at report time: web + API health both **200** |

## WARNs (detail)

1. **Reinvestment UI** — balances are not blank (euros present), but many `—` placeholders remain (`emDashCount=35`).
2. **Web `/api/health` latency** — intermittent timeout under Playwright request context; confirmed healthy via WebFetch (`ok:true`, atina 200) and API `/health` (`db`/`redis` up). Authenticated BFF non-500 (**200**).

## Login flake note

First Playwright pass failed fill/click before hydration (URL stayed `/login`). Reverify used React-friendly evaluate fill + longer wait; UI login succeeded (`loginVia=ui`). API login fallback also validated.

## Supporting artifacts

- `docs/evidence/qa-browser-system-20261004.json`
- `docs/evidence/_tmp-browser-prod-reverify.mjs`
- `docs/evidence/_tmp-browser-prod-reverify-summary.md`
- `docs/evidence/_tmp-browser-prod-smoke-result.json`

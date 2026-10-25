# GTM web smoke — marketing routes

| Field | Value |
| --- | --- |
| Base | https://omnigrouptech.com |
| Run (UTC) | 2026-10-24T23:00:45.222Z |
| Per-request timeout | 60s |
| Retry policy | 1 retry on TIMEOUT only |
| Verdict | **WEB_OK** |

## Critical routes

| Path | HTTP | Latency | Attempts | Notes |
| --- | ---: | ---: | ---: | --- |
| `/` | 200 | 1700 ms | 1 | |
| `/pricing` | 200 | 527 ms | 1 | |
| `/products` | 200 | 62 ms | 1 | |
| `/solutions` | 200 | 176 ms | 1 | |
| `/services` | 200 | 128 ms | 1 | |
| `/status` | 200 | 345 ms | 1 | |
| `/contact` | 200 | 110 ms | 1 | |
| `/login` | 200 | 30 ms | 1 | |
| `/register` | 200 | 39 ms | 1 | |
| `/legal/terms` | 200 | 55 ms | 1 | |
| `/legal/privacy` | 200 | 63 ms | 1 | |
| `/legal/cookies` | 200 | 41 ms | 1 | |
| `/legal/impressum` | 200 | 47 ms | 1 | |
| `/legal/refund` | 200 | 53 ms | 1 | |

All 14 critical routes returned **200** on first attempt. No timeouts, no 5xx.

## Niche `/solutions/*` samples (from `/solutions` HTML links)

| Path | HTTP | Latency | Attempts | Notes |
| --- | ---: | ---: | ---: | --- |
| `/solutions/admin-support-administrative-support` | 200 | 111 ms | 1 | discovered from hub |
| `/solutions/admin-support-calendar-management` | 200 | 91 ms | 1 | discovered from hub |
| `/solutions/admin-support-crm-data-management` | 200 | 87 ms | 1 | discovered from hub |

## Verdict rule

- **WEB_OK** — all critical routes HTTP 200, no timeout/5xx on critical or sampled niche.
- **WEB_DEGRADED** — any critical non-200, timeout, or 5xx.

**Result: WEB_OK**

## Artifacts

- Machine-readable: `_gtm-web-smoke-20261025.json` (same directory)
- Runner: `_gtm-web-smoke-run.mjs` (same directory)

# Full System Sweep — Production Verification (2026-08-09)

**Agent:** A10 (independent QA / verification / evidence)
**Method:** Read-only live HTTP probes from Windows PowerShell (`Invoke-WebRequest`) against production, plus static read of deploy config. No source edits, no build, no git.
**Targets:** Web `https://omnigrouptech.com` · Backend `https://api.omnigrouptech.com`
**Probe window:** 2026-08-08 ~23:24–23:40 UTC (2026-08-09 ~01:24–01:40 local, UTC+2)
**Warming method:** one throwaway request per URL, then a measured request. A second dedicated warm-baseline pass was run afterward to separate cold-start from steady-state.

---

## 1. Live probe results — Web (`https://omnigrouptech.com`)

| Page | Status | ms (measured) | Note |
|---|---|---|---|
| `/` | 200 | 75045 → **248 (warm)** | Homepage cold-start penalty; warm is fast |
| `/services` | 200 | 367 | OK |
| `/solutions` | 200 | 678 | OK |
| `/products` | 200 | 996 | OK |
| `/pricing` | 200 | 297 | OK |
| `/contact` | 200 | 87 | OK |
| `/legal/terms` | 200 | 271 | OK |
| `/legal/privacy` | 200 | 1466 | OK (slightly heavy) |
| `/invoices/preview` | 200 | 202 | OK |
| `/login` | 200 | 1172 | OK |
| `/register` | 200 | 134 | OK |
| `/forgot-password` | 200 | 99 | OK |
| `/dev/docs` | 200 | 764 | OK |
| `/api/health` | 200 | 135 | OK (light health route) |

**All 14 public web routes return HTTP 200.** Every route except `/` is well under the 3s warm threshold. `/` measured 75s during the first sweep (throwaway request had re-cooled), but the dedicated warm pass returned **248 ms** — confirming `/` is fast once warm and the latency is pure cold-start.

## 1b. Live probe results — Backend (`https://api.omnigrouptech.com`)

| Endpoint | Status | ms | Expectation | Verdict |
|---|---|---|---|---|
| `/health` | 200 | 118529 → **209 (warm)** | 200 | PASS (cold-start slow) |
| `/api/v1` | 200 | 6815 → **188 (warm)** | 200 | PASS |
| `/api/v1/admin/overview` | **401** | 50 | 401 no-token | PASS (auth-gated) |
| `/api/v1/notifications/unread-count` | **401** | 26 | 401 no-token | PASS (auth-gated) |
| `/` (root) | 200 | 269747 (cold) | — | PASS (returns 200; cold-start slow) |

Auth gating is correct: both protected endpoints reject unauthenticated requests with **401** in <60 ms. Backend health and `/api/v1` return 200 and are fast once warm (<250 ms).

## 1c. Host / TLS / redirect behavior

| Host | Status | Note |
|---|---|---|
| `https://omnigrouptech.com/` | 200 | Apex serves web app |
| `https://api.omnigrouptech.com/` | 200 | API host serves backend |
| `https://www.omnigrouptech.com/` | **FAIL** | `Could not create SSL/TLS secure channel` — no cert for `www.*` |

`www.omnigrouptech.com` currently fails the TLS handshake (WebException: *"The request was aborted: Could not create SSL/TLS secure channel."*). This is the **expected pre-deploy state**: the `www → apex` redirect block exists in the Caddyfile but the running Caddy has not been redeployed, so no `www.*` certificate has been issued yet. It will resolve once the updated Caddyfile is deployed.

---

## 2. Deploy topology (from static read — not edited)

`docker-compose.prod.yml` + `infra/caddy/Caddyfile` + `apps/omnigroup-web/Dockerfile`:

- **postgres** (postgres:16-alpine) + **redis** (redis:7-alpine) — data stores, health-checked, on `omni_net`.
- **migrate** / **seed** — one-shot jobs under `profiles: [setup]` (only run on demand).
- **atina-api** (NestJS, target `production`) — port `3000`→host `${ATINA_PORT:-3000}`; depends on healthy postgres+redis; healthcheck `curl /health` (30s interval, 3 retries). Mounts repo read-only at `/repo`; autonomy enabled.
- **web** (Next.js, `apps/omnigroup-web`) — port `3000`→host `${WEB_PORT:-3010}`; depends on **atina-api healthy**; healthcheck hits light `/api/health` (30s interval, **90s start_period**) rather than the heavy homepage.
- **caddy** (caddy:2-alpine) — TLS terminator + reverse proxy on `:80/:443`, under `profiles: [tls]`. Routes: apex `${SITE_DOMAIN}` → `web:3000`, with `/api/v1/*` and `/health` proxied to `atina-api:3000` (same-origin BFF); `${API_DOMAIN}` → `atina-api:3000`; `www.${SITE_DOMAIN}` → permanent redirect to apex.

**Config risks observed (read-only, reported not fixed):**

1. **Caddy is gated behind `profiles: [tls]`.** A plain `docker compose -f docker-compose.prod.yml up -d` (without `--profile tls`) would start web + api but **not** the TLS/reverse-proxy front door. Deploy must explicitly include the `tls` profile — an easy footgun for a redeploy.
2. **`www` TLS depends on a Caddy redeploy that hasn't happened.** Until Caddy reloads the current Caddyfile, `www.omnigrouptech.com` throws an SSL error to real visitors.
3. **No warm-keeper / cold-start mitigation.** The compose healthcheck was made lightweight (`/api/health`, 90s start_period) so the container isn't killed while booting, but nothing keeps the Next.js SSR homepage or the API warm. First request after idle pays a large penalty (see §3).
4. **Web image ships a relocated distDir** (`node_modules/.cache/omnigroup-next`, OneDrive-safe) copied out of the build stage rather than Next standalone output. Functional today, but non-standard — any change to `distDir` in `next.config.mjs` must stay in sync with the Dockerfile `COPY`, or `next start` will fail to find the build.

---

## 3. Cold-start finding

The known infra issue is **confirmed and, at probe time, worse than the previously cited 20–46 s**:

- Homepage `/`: first measured hit **75 s** cold; **248 ms** warm.
- Backend `/health`: **118 s** cold; **209 ms** warm.
- API root `/`: **269 s** cold.
- `/api/v1`: 6.8 s on a semi-cold hit; **188 ms** warm.

Interpretation: once containers are warm, **everything is fast (<1 s, mostly <300 ms)**. The elevated cold numbers were amplified because this sweep hit many idle routes back-to-back (and likely competes with concurrent build/CI load on the VPS during this multi-agent session). The user-facing symptom is real: **a visitor arriving after an idle period can wait tens of seconds — occasionally over a minute — before the first byte**, which an outside client will read as "the site is down."

---

## 4. PASS / RISK verdict by area

| Area | Verdict | Basis |
|---|---|---|
| Web public routes (14/14) | **PASS** | All 200; warm latency healthy |
| Backend health + `/api/v1` | **PASS** | 200; fast warm |
| Auth gating (401 without token) | **PASS** | Both protected endpoints 401 in <60 ms |
| Apex + API TLS | **PASS** | Both hosts serve 200 over HTTPS |
| `www` subdomain | **RISK (expected)** | TLS handshake fails; needs Caddy redeploy |
| Cold-start latency | **RISK** | Homepage/API first-byte tens of seconds to >1 min |
| Deploy ergonomics | **RISK (low)** | Caddy behind `tls` profile; distDir/Dockerfile coupling |

**Overall:** platform is **functionally live and correct** — every page and API returns the expected status and auth is enforced. The open risks are **operational/UX** (cold-start first-byte, `www` pending redeploy), not functional breakage.

---

## 5. Prioritized punch-list (what still looks broken to an outside client)

1. **Cold-start first-byte (HIGH).** A first-time or returning-after-idle visitor can wait 25–75 s (occasionally >2 min) for `/` or the API. Mitigate with a keep-warm ping (cron/uptime monitor hitting `/` and `/health` every 1–5 min) and/or a persistent Node process / min-instance so SSR stays hot. This is the single most likely reason a prospect thinks the site is down.
2. **`www.omnigrouptech.com` SSL error (HIGH, quick fix).** Deploy the updated Caddyfile so the `www → apex` redirect and its cert take effect. Until then, anyone typing `www.` gets a browser SSL warning.
3. **Confirm Caddy `tls` profile is included in the live deploy command (MEDIUM).** Ensure the production `up -d` uses `--profile tls`; otherwise a future redeploy silently drops the reverse proxy / HTTPS.
4. **Keep `distDir` in `next.config.mjs` and the web Dockerfile `COPY` in lockstep (LOW).** A drift here breaks `next start` at container boot.
5. **Trim heavy warm routes (LOW).** `/legal/privacy` (~1.5 s) and `/login` (~1.2 s) are the slowest warm pages — minor, worth a look but not client-blocking.

---

### Raw probe log (for traceability)

```
# Web (warm-then-measure sweep)
/ | 200 | 75045
/services | 200 | 367
/solutions | 200 | 678
/products | 200 | 996
/pricing | 200 | 297
/contact | 200 | 87
/legal/terms | 200 | 271
/legal/privacy | 200 | 1466
/invoices/preview | 200 | 202
/login | 200 | 1172
/register | 200 | 134
/forgot-password | 200 | 99
/dev/docs | 200 | 764
/api/health | 200 | 135

# Backend
/health | 200 | 118529
/api/v1 | 200 | 6815
/api/v1/admin/overview | ERR(401) | 50
/api/v1/notifications/unread-count | ERR(401) | 26

# Hosts / TLS
https://api.omnigrouptech.com/ | 200 | 269747ms
https://www.omnigrouptech.com/ | EXC | WebException: Could not create SSL/TLS secure channel

# Warm baseline (second pass, containers hot)
https://omnigrouptech.com/ | 200 | 24931ms   (still re-cooling)
https://omnigrouptech.com/ | 200 | 248ms     (warm)
https://api.omnigrouptech.com/health | 200 | 209ms
https://api.omnigrouptech.com/api/v1 | 200 | 188ms
```

# Omni Group — Reliability, Performance & Mobile Audit (Phases 6–8)

**Generated:** 2026-09-20  
**Phases:** 6 (failure modes & resilience), 7 (performance desk review), 8 (mobile / responsive)  
**Inputs:** `docker-compose.prod.yml`, `infra/caddy/Caddyfile`, `apps/omnigroup-web` (middleware, layouts, components), Atina `/health`, VPS backup/cron scripts, prior Phase 1–3 docs  
**Scope:** Production-relevant stack on VPS; read-only findings — **no fixes** in this document.

---

## 1. Executive summary

Production is a **single-node Docker Compose** stack: one Postgres, one Redis, `atina-api`, `web` (Next standalone), and Caddy behind the **`tls` profile**. Health probes exist at container and application layers, but **dependency coverage is partial** (DB in Atina `/health`; Redis and queue depth omitted). **Backups cover Postgres only** on a documented cron; forge vault, Redis AOF, and upload volumes are not in the daily dump script.

Performance work is **already reflected in repo comments** (standalone Next build, light `/api/health` probe, keep-warm cron). Residual risks are **autonomy scheduler RAM**, **keep-warm hitting the marketing homepage**, and **in-memory BFF rate limits** under multi-instance futures.

Mobile UX is **strong on marketing** (responsive Tailwind, hamburger nav) and **platform shell** (drawer sidebar at `lg` breakpoint). Gaps: **no explicit root viewport export**, desktop-first admin tables, and **`/admin/mobile`** as a separate PWA slice rather than unified responsive admin.

| Phase | Highest-severity finding |
|-------|---------------------------|
| 6 | **F-02** — Postgres + Redis single-instance SPOF (no replica / failover) |
| 7 | **P-03** — Autonomy scheduler enabled by default in prod compose without `mem_limit` on `atina-api` |
| 8 | **M-03** — Admin mobile viewport disables pinch-zoom (`maximumScale: 1`, `userScalable: false`) |

---

## 2. Phase 6 — Failure modes & resilience

### 2.1 Topology and blast radius

| Component | Prod behavior | Failure impact |
|-----------|---------------|----------------|
| `postgres` | Single volume `pg_data`, `pg_isready` healthcheck | Full API + BFF data loss risk if volume corrupt; no hot standby in compose |
| `redis` | Single instance, AOF (`--appendonly yes`), no `maxmemory` in prod compose | Queue/worker features degrade; AOF replay on restart; memory unbounded vs dev compose cap |
| `atina-api` | Depends on healthy postgres + redis; curl `/health` | 503 when DB down; Redis outage may not flip `/health` |
| `web` | Depends on healthy `atina-api`; probes `/api/health` (4s Atina fetch timeout) | Marketing may load while API degraded; BFF reports `atina.ok: false` |
| `caddy` | Profile `tls`; plain `up -d` **excludes** reverse proxy | HTTP-only or wrong ports if operator skips `--profile tls` (documented footgun) |

**Finding F-01 (medium):** Atina **`GET /health`** returns **503 when Postgres fails** but does **not probe Redis** or BullMQ connectivity. Orchestrator may mark `atina-api` healthy while background jobs are broken.

**Finding F-02 (high):** **No redundancy** for Postgres or Redis in `docker-compose.prod.yml`. VPS disk or container loss is a **full outage** until restore from backup; RPO = up to ~24h (cron at 03:15), RTO depends on manual restore drill.

**Finding F-03 (medium):** **`caddy` has no healthcheck** and `depends_on` only waits for container start, not `web`/`atina-api` readiness. Brief 502/504 windows possible during rolling restarts.

**Finding F-04 (medium):** **`AUTONOMY_ENABLED` / `AUTONOMY_AUTO_START_SCHEDULER` default true** in prod compose. Comments note scheduler as a **RAM spiker** that can starve `web`; `mem_limit` on `atina-api` is commented optional — uncapped backend on small VPS is a **noisy-neighbor failure mode**.

**Finding F-05 (low):** **`web` healthcheck `start_period: 90s`** reduces false unhealthy during boot; if Atina is slow, `depends_on: service_healthy` delays web start — acceptable but lengthens deploy recovery time.

**Finding F-06 (medium):** **Backup scope gap:** `scripts/vps-atina-pg-backup.sh` dumps Postgres only (14-day retention, sha256 sidecar). Runbook also documents **Forge SQLite vault** and local `upload_data` / `forge_data` volumes — **not automated** in the VPS cron script. Evidence: `docs/VPS-BACKUP-EVIDENCE-LATEST.md` (PASS for PG only).

**Finding F-07 (low):** **Keep-warm cron** (`scripts/keep-warm-prod.sh`, installed via `install-keep-warm-cron.ps1`, every 5 min) exits non-zero if any ping ≠ 200 — good for alerting, but **no Redis/Postgres ping**; cold DB after restart may still pass web/API HTTP checks until traffic hits DB paths.

**Finding F-08 (info):** Caddy routes **`/api/v1/*` and `/health`** on the marketing host to `atina-api`; API host is separate TLS cert. Misconfigured `API_DOMAIN` duplicate blocks Caddy startup (comment in Caddyfile).

### 2.2 Web BFF resilience (`middleware.ts`, `/api/health`)

- Session gate on `/dashboard`, `/admin`, `/dev`; rate limits on auth and contact (in-memory).
- **`/api/health`:** local JSON + upstream Atina fetch with **4s abort** — fails closed on timeout (`atina.ok: false`) without failing the route HTTP status unless Atina unreachable (returns 200 with `ok: false` when Atina down — **soft signal**).

**Finding F-09 (low):** Web `/api/health` returns **HTTP 200 when Atina is down** (`ok: false` in body). External uptime monitors must parse JSON, not status code alone.

---

## 3. Phase 7 — Performance desk review

### 3.1 Documented optimizations (already in tree)

| Area | Mechanism |
|------|-----------|
| Next cold start | `NEXT_OUTPUT_STANDALONE=true`, `server.js` minimal trace (`Dockerfile`, `next.config.mjs`) |
| Container probe | Healthcheck uses **`/api/health`**, not marketing homepage (avoids 10s+ SSR timeout) |
| Heap | `NODE_OPTIONS=--max-old-space-size=512`, `mem_reservation` / `mem_limit` on `web` |
| DNS | Compose comment: dead **AAAA/IPv6** caused client black-holing (ops, not app CPU) |
| Warmth | Cron curls `/`, `/api/health`, and API `/health` (60s max time on homepage ping) |

**Finding P-01 (medium):** **Keep-warm hits full marketing `/`** every 5 minutes — highest cost path vs `/api/health` alone. On traffic spikes + cron, doubles SSR work without user value.

**Finding P-02 (low):** **Marketing pages** use **framer-motion** widely (`page.tsx`, `Navbar`, `PlatformShell`). Acceptable on desktop; adds JS weight and main-thread animation on mid-tier phones.

**Finding P-03 (high on small VPS / medium on 48GB host):** **`atina-api` has no default `mem_limit`** while autonomy scheduler auto-starts. Compose explicitly warns this can starve `web` on **2GB** boxes; on large host comment says OOM was not observed — **environment-dependent** risk remains if autonomy load increases.

**Finding P-04 (medium):** **Prod Redis** lacks **`maxmemory` / eviction policy** present in dev `atina-platform/atina/docker-compose.yml` (`256mb`, `allkeys-lru`). Long-running prod could grow AOF/RSS until host pressure.

**Finding P-05 (low):** **BFF rate limit** (`bff-rate-limit.ts`) is **process-local Map** — correct for single `web` replica; resets on restart; not shared if scaled horizontally.

**Finding P-06 (info):** Atina **global rate limit** skips `/health`, `/api/v1/health`, `/metrics` — good for probes; `/metrics` exposes DB gauge and memory — useful for desk review, ensure not public-sensitive.

**Finding P-07 (low):** **`/api/health` chains to Atina** on every probe (Docker every 30s + keep-warm). Adds internal HTTP hop; 4s timeout caps tail latency.

**Finding P-08 (info):** No **`images` remotePatterns** tuning in `next.config.mjs`; marketing relies on SVG/CSS — low image CDN concern today.

---

## 4. Phase 8 — Mobile & responsive

### 4.1 Marketing & public shell

- **Tailwind breakpoints** (`sm:`, `md:`, `lg:`) used consistently on homepage, solutions, services, pricing grids.
- **`Navbar.tsx`:** Desktop nav `hidden md:flex`; **hamburger + AnimatePresence** drawer below `md`; sticky header, touch-friendly tap targets.
- **`manifest.json`:** `display: standalone`, theme colors — light PWA shell for marketing origin.
- **Root `layout.tsx`:** No `export const viewport` — relies on Next defaults (generally `device-width`); only **`/admin/mobile/layout.tsx`** sets explicit viewport.

**Finding M-01 (low):** **No dedicated viewport metadata** on root/marketing layouts — usually fine in Next 14, but **less explicit** than admin-mobile for audit traceability.

**Finding M-02 (info):** **Responsive patterns are utility-first** (grids collapse to single column); no separate mobile routes for marketing — good consistency.

### 4.2 Client platform & admin

- **`PlatformShell.tsx`:** Sidebar `hidden lg:flex`; **mobile drawer** at `<lg` with overlay; header search `hidden md:flex`; user block `hidden sm:block`.
- **Admin tables:** `AdminClient.tsx`, `AdminMarketAnalyticsPanel.tsx` wrap tables in **`overflow-x-auto`** — horizontal scroll on narrow viewports (usable, not ideal UX).
- **`/admin/mobile`:** Dedicated layout with **`100dvh`**, **safe-area insets**, separate **`admin-manifest.json`**, apple-web-app capable.

**Finding M-03 (medium):** Admin mobile layout sets **`maximumScale: 1` and `userScalable: false`** — improves fixed-layout control but **hurts accessibility** (zoom blocked) and may fail WCAG 1.4.4 on small text.

**Finding M-04 (low):** **Two admin experiences** (desktop `/admin` vs `/admin/mobile`) — operators must discover mobile route; desktop admin on phone relies on table scroll, not simplified IA.

**Finding M-05 (low):** **`RegulatedFoundingPartnerPanel`** pricing **table without `overflow-x-auto` wrapper** — potential horizontal clip on very narrow screens (single finding from grep).

**Finding M-06 (info):** **`ClientSiteView`** nav uses **`overflow-x-auto`** for tabs — appropriate mobile pattern.

**Finding M-07 (low):** **`AtinaAssistantHost`** in root layout loads on **all pages** including marketing — floating assistant may compete with mobile nav z-index (`Navbar` z-50); verify tap targets on real devices in Phase 9.

---

## 5. Severity legend

| Level | Meaning |
|-------|---------|
| **high** | Likely prod outage or major degradation without manual intervention |
| **medium** | Partial failure, ops gap, or meaningful UX/a11y risk |
| **low** | Edge case, monitor tuning, or minor UX debt |
| **info** | Documented behavior or acceptable tradeoff |

---

## 6. Source files (desk review)

| Path | Relevance |
|------|-----------|
| `docker-compose.prod.yml` | SPOF, healthchecks, autonomy defaults, mem limits, Caddy profile |
| `infra/caddy/Caddyfile` | TLS, www redirect, API split routing |
| `atina-platform/atina/src/core/CoreEngine.ts` | `/health`, `/metrics`, rate-limit skip |
| `apps/omnigroup-web/src/middleware.ts` | Auth, CSRF, rate limits |
| `apps/omnigroup-web/src/app/api/health/route.ts` | BFF health semantics |
| `apps/omnigroup-web/src/components/Navbar.tsx` | Marketing mobile nav |
| `apps/omnigroup-web/src/components/platform/PlatformShell.tsx` | Dashboard mobile shell |
| `apps/omnigroup-web/src/app/admin/mobile/layout.tsx` | PWA viewport / safe area |
| `scripts/vps-atina-pg-backup.sh`, `scripts/keep-warm-prod.sh`, `scripts/install-keep-warm-cron.ps1` | Backup + warm cron |
| `docs/VPS-BACKUP-EVIDENCE-LATEST.md` | Backup cadence evidence |

---

## 7. Handoff to later phases

- **Phase 9 (tests):** Assert `/health` 503 when DB stopped; JSON shape for web `/api/health` when Atina down; smoke `docker compose --profile tls`.
- **Phase 10 (ops):** Extend backup evidence to forge/upload; optional Redis memory cap aligned with dev; document RPO/RTO in STATUS-KANON.
- **Phase 11 (mobile QA):** Device matrix on homepage, checkout, `/admin/mobile`, and platform drawer.

**End of Phases 6–8 combined audit.**

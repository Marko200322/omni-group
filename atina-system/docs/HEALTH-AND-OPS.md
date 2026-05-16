# Atina System (Nest) — health i operativa

**Next — interni dok hub (monorepo):** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../../apps/omnigroup-web/README.md).

## Root i health endpointi

U [`src/app.controller.ts`](../src/app.controller.ts) isti handler pokriva **`GET /`** i **`GET /health`** (`@Get(['', 'health'])`). Odgovor gradi [`HealthService`](../src/health/health.service.ts): uvek **`ok: true`**, **`name: "atina-system"`**, **`ts`**, **`blueprint`**. Bez **`REDIS_HOST`**: **`redis.configured: false`**, **`bull.enabled: false`**. Sa Redisom: **`bull.enabled: true`**, **`queues: ['system']`**, plus PING u Redis (vidi servis za tačan oblik polja **`redis`**).

**Dev-only:** `POST /internal/queue/smoke` (u produkciji **404**) — detalji u [`../README.md`](../README.md).

## Logovi: dev vs Docker

- **`npm run start:dev` (lokalno):** Nest **`Logger`** i `console` idu na **stdout/stderr** procesa (terminal koji pokreće dev server). Nema posebnog fajl-loga u repou.
- **Docker:** isti tok — aplikacija piše na **stdout/stderr** kontejnera; pregled sa hosta: `docker compose logs` / `docker compose logs -f atina-api` (ime servisa uskladi sa [`../../docker-compose.atina.yml`](../../docker-compose.atina.yml)).

Širi kontekst (multi-stack health, struktura logova, ritual posle deploy-a): **[`docs/OBSERVABILITY-RUNBOOK.md`](../../docs/OBSERVABILITY-RUNBOOK.md)**.

## HTTP smoke i Atina gate

Multi-stack HTTP provera (Astra + Nest; opciono Node): **[`scripts/smoke-stack.ps1`](../../scripts/smoke-stack.ps1)**. Za uvezani Atina prolaz (login, Forge, admin) u monorepu: **`npm run smoke:all`** u **`atina-platform/atina`** — formalni gate u **[`release-gate-checklist.md`](../../atina-platform/atina/docs/operations/release-gate-checklist.md)** (*Local notes — Smoke tests*).

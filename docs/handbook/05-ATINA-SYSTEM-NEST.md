# 05 — Atina System (NestJS, `atina-system`)

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`04-ATINA-EXPRESS-SAAS.md`](./04-ATINA-EXPRESS-SAAS.md) · Sledeće: [`06-OMNIGROUP-WEB.md`](./06-OMNIGROUP-WEB.md)

`atina-system` je zaseban, mnogo manji NestJS API nastao za PDF/„Titan” scenarije (Master Spec, Nivo 2). Ima **svoju** Postgres bazu `atina`, svoj port (3001) i svoj CI. Nije zamena za Express Atinu i omnigroup-web ga podrazumevano ne zove.

## Tehnologija

NestJS `^10`, TypeORM `^0.3.28`, `@nestjs/jwt` + Passport JWT, `bcrypt`, `@nestjs/schedule`, `@nestjs/bullmq` + `bullmq` + `ioredis` (opciono), `pg`, `helmet`, `class-validator`.

## Pokretanje

```bash
cd atina-system
npm ci
cp .env.example .env            # PORT=3001, POSTGRES_* (host port 5433 u compose-u)
npm run start:dev               # http://127.0.0.1:3001/health
```

Docker: iz korena monorepa

```bash
docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml up -d --build
# Postgres :5433, Redis :6380, Nest :3001→3000
```

Produkcija: `npm run build && npm run start:prod` (`node dist/main`). Bootstrap: `src/main.ts` → `src/bootstrap/configure-app.ts` (helmet, `ValidationPipe`, CORS iz `CORS_ORIGINS`, `TRUST_PROXY`).

## Env

| Promenljiva | Napomena |
|-------------|----------|
| `NODE_ENV`, `PORT` (3001 lokalno; proces podrazumevano 3000), `PHASE` | |
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB`, `POSTGRES_SSL`, `POSTGRES_SSL_REJECT_UNAUTHORIZED` | DB `atina`; **Port mismatch** lokalno = `POSTGRES_PORT` mora pratiti host port (5433 u compose-u) — vidi `scripts/README.md` |
| `JWT_SECRET` | 7-dnevni tokeni |
| `TYPEORM_SYNC`, `TYPEORM_LOG` | `TYPEORM_SYNC` mora biti `false` u produkciji; plan isključenja u `atina-system/docs/MIGRATIONS-PLAN.md` |
| `REDIS_HOST/PORT` | Ako su zadati, pali se BullMQ red `system` |
| `INTERNAL_QUEUE_SMOKE_KEY`, `INTERNAL_QUEUE_SMOKE_RATE_*` | Dev-only `POST /internal/queue/smoke` (404 u produkciji) |
| `E2E_WITH_DB` | Uključuje e2e testove koji traže bazu |
| `NEST_NODE_ENV` | Compose-specifično |

Ako env nije postavljen, `src/config/apply-env-aggregator.ts` može da primeni vrednosti iz `config/env-aggregator.json` sekcije `nest`. Nema `VAULT_PATH` / `FORGE_VAULT_PATH` (`docs/VAULT-ALIGNMENT-NOTES.md`).

## Rute

| Metod | Putanja | Auth | Kontroler |
|-------|---------|------|-----------|
| GET | `/`, `/health` | javno | `app.controller.ts` |
| POST | `/internal/queue/smoke` | header `x-internal-queue-smoke-key` (dev) | `app.controller.ts` |
| POST | `/auth/register`, `/auth/login` | javno | `modules/auth/auth.controller.ts` |
| GET | `/users/me` | `AuthGuard('jwt')` | `modules/users/users.controller.ts` |
| POST/GET/GET/PATCH | `/leads`, `/leads/:id` | javno (bez guard-a) | `modules/crm/crm.controller.ts` |
| POST/GET/GET/PATCH | `/contracts`, `/contracts/:id` | javno | `modules/contracts/contracts.controller.ts` |
| POST/GET/GET/PATCH | `/invoices`, `/invoices/:id` | javno | `modules/billing/billing.controller.ts` |
| POST | `/ai/chat`, `/ai/session` | javno | `modules/ai/ai.controller.ts` |
| GET | `/dashboard/overview` | javno | `modules/analytics/analytics.controller.ts` |
| GET | `/notifications/health` | javno | `modules/notifications/notifications.controller.ts` |
| GET / POST | `/supply/vault/status`, `/supply/vault/resource` | javno | `modules/supply-core/supply-core.controller.ts` |

Napomena bezbednosti: jedini guard je na `/users/me`. Pre izlaganja Nest-a javno, CRUD rute treba zaštititi (backlog u `atina-system/docs/HEALTH-AND-OPS.md`).

## Entiteti i migracija

Jedna TypeORM migracija `src/database/migrations/1739126400000-InitialSchema.ts` pravi šest tabela:

| Tabela | Kolone | Relacije |
|--------|--------|----------|
| `users` | `id` uuid, `email`, `password_hash`, `created_at` | 1→N `contracts`; **nema kolonu uloge** |
| `leads` | `id`, `name`, `email`, `status`, `user_id`, `created_at` | — |
| `contracts` | `id`, `user_id`, `status`, `value` numeric, `created_at` | N→1 `users`, 1→N `invoices` |
| `invoices` | `id`, `contract_id`, `amount`, `status`, `created_at` | N→1 `contracts` |
| `vault_resources` | `id`, `provider`, `resource_type`, `label`, `payload_json`, `created_at` | — (Postgres, ne SQLite) |
| `supply_agent_heartbeats` | `id`, `resource_count`, `pending_workers`, `phase`, `created_at` | — |

## Pozadinski posao

`supply-agent.service.ts`: `@Cron(CronExpression.EVERY_30_SECONDS)` broji `vault_resources`, upisuje heartbeat i (opciono) stavlja posao u BullMQ red `system`.

## Testovi i CI

| Komanda | Šta |
|---------|-----|
| `npm test` | 32 `*.spec.ts` (~128 `it`) |
| `npm run verify:n1` | build + unit (bez baze) |
| `npm run verify:ci` | build + unit + `migration:run` + e2e (`test/app.e2e-spec.ts`, treba Postgres) |

CI: root workflow job `atina-system` (Postgres 15 servis → `verify:ci`) i ugnježdeni `atina-system/.github/workflows/ci.yml`. Lokalno bez Postgresa koristi `verify:n1`.

## Dokumenti

`atina-system/docs/`: `HEALTH-AND-OPS.md`, `TYPEORM-PRODUCTION-CHECKLIST.md`, `MIGRATIONS-PLAN.md`, `NPM-AUDIT-NIVO1.md`, `NIVO-3-SUPPLY-CORE-PDF.md`; monorepo nivo: `docs/TYPEORM-PROD-EVIDENCE-LATEST.md`.

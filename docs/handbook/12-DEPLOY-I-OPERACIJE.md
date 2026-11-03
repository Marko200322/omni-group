# 12 — Deploy i operacije

**Deo priručnika:** [`README.md`](./README.md) · Prethodno: [`11-RAZVOJ-I-TESTIRANJE.md`](./11-RAZVOJ-I-TESTIRANJE.md) · Sledeće: [`13-POSLOVNI-MODEL-I-PAKETI.md`](./13-POSLOVNI-MODEL-I-PAKETI.md)

Ovo poglavlje daje mapu; korak-po-korak runbook-i već postoje i ovde su samo povezani. Obavezni koraci pre svakog produkcionog deploy-a: [`../PRE-DEPLOY-MANDATORY.md`](../PRE-DEPLOY-MANDATORY.md).

## Produkcija na VPS-u (`docker-compose.prod.yml`)

```bash
cp .env.docker.prod.example .env.docker.prod   # DB_NAME, DB_USER, DB_PASSWORD, ATINA_PORT, WEB_PORT, AUTONOMY_*
# Atina i web čitaju svoje .env fajlove (atina-platform/atina/.env, apps/omnigroup-web/.env.production)
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d --build
docker compose -f docker-compose.prod.yml --profile tls up -d caddy        # ako Caddy terminira TLS
```

Servisi: `postgres`, `redis`, `migrate` + `seed` (jednokratno), `atina-api` (Express), `web` (Next), `caddy` (profil `tls`, `SITE_DOMAIN`/`API_DOMAIN` → `web:3000` / `atina-api:3000`). Atina skripta `npm run deploy:production` (`scripts/deploy-production.ps1`) radi build + migrate + restart za scenario bez compose-a.

| Dokument | Sadržaj |
|----------|---------|
| `atina-platform/atina/docs/operations/deploy-rollback-checklist.md` | Deploy i rollback koraci Atine |
| `atina-platform/atina/docs/operations/release-gate-checklist.md` | Formalni release gate (build, lint, jest, `npm run smoke:all`) |
| `atina-platform/atina/docs/operations/production-config-matrix.md` | Koja tajna gde ide |
| [`../STAGING-RELEASE-CHECKLIST.md`](../STAGING-RELEASE-CHECKLIST.md), [`../STAGING-MIRROR-PROD.md`](../STAGING-MIRROR-PROD.md) | Staging kao ogledalo produkcije |
| [`../GO-LIVE-100.md`](../GO-LIVE-100.md), [`../ADMIN-STAVKE-M0-M1.md`](../ADMIN-STAVKE-M0-M1.md) | Go-live i M0/M1 stavke vlasnika (DNS `api.omnigrouptech.com`, prva uplata) |

## Ostali compose fajlovi

| Fajl | Namena |
|------|--------|
| `docker-compose.yml` | Python stack (forge, atina worker, astra) |
| `docker-compose.atina.yml` + `docker-compose.nest-port-3001.yml` | Nest + Postgres :5433 + Redis :6380 |
| `atina-platform/atina/docker-compose.yml` | Atina sa sopstvenim Postgres/Redis za lokalni rad (`npm run db:up`) |
| `docker-compose.override.vault-bindmount.example.yml` | Deljenje SQLite vault-a Python ↔ Node |

CI job `compose` validira sva tri (`docker compose config --quiet`).

## Kubernetes (`infra/k8s`)

Kustomize **base**: `namespace.yaml`, `atina-saas/` (deployment, service, migrate-job), `nest-api/`, `omnigroup-web/`, `postgres/` (StatefulSet), `redis/`. **Overlay-i**: `staging` (hostovi `api-staging.example.com`, `nest-staging.example.com`, `app-staging.example.com`) i `prod` (`api.`, `nest.`, `app.example.com` + HPA primer). Pomoćna skripta `scripts/deploy-k8s.ps1`. Python workeri su backlog CronJob-ovi. Detalji: `infra/k8s/README.md`.

## Observability

Minimum danas: `/health` probe (Express, Nest, web `/api/health`, Astra `/api/status`) + `kubectl logs` / `docker logs`. Preporuka iz `infra/observability/README.md`: kube-prometheus-stack, Loki, opciono Tempo/Jaeger; Express `/metrics` je backlog. Alarmi: `AtinaSaaSDown`, `PostgresDisk80`, `RedisUnreachable`. Runbook: [`../OBSERVABILITY-RUNBOOK.md`](../OBSERVABILITY-RUNBOOK.md). Interni kanal alarma: Express `alert-system` + `system_alerts`, Telegram (`TELEGRAM_*`), politika `atina-platform/atina/docs/operations/monitoring-alert-channel-policy.md`.

## Backup i oporavak

| Šta | Kako |
|-----|------|
| Postgres `atina_saas_db` | `atina-platform/atina/docs/operations/db-backup-restore-runbook.md`, drill `db-rollback-drill-runbook.md`; Express modul `backup-recovery` (`POST /api/v1/backup-recovery/snapshot`, `/restore`) beleži `backup_snapshots` |
| SQLite vault | `npm run vault:backup` / `vault:prune` / `vault:restore:latest` (`scripts/vault-db-ops.ps1`) |
| Artefakti isporuka | Fajl sistem artifact store-a — uključiti u backup volumena |
| Disk / CI oporavak | [`../RECOVER-DISK-AND-CI.md`](../RECOVER-DISK-AND-CI.md) |

## Svakodnevne operacije vlasnika/admina

| Zadatak | Gde |
|---------|-----|
| Potvrda ručne uplate | `/admin` → Payments → Confirm (Express `POST /payments/manual/confirm/:id`) |
| Odobrenje/odbijanje isporuke | `/admin` → Fulfillment (`POST /billing/fulfillment/jobs/:paymentId/approve` ili `/reject`) |
| Nadzor retainera | `/admin` → Fulfillment lista sa `retainer_schedule`; scheduler sam ponavlja |
| Budžet autonomy loop-a | `/admin` → Autonomy (`GET /autonomy-loop/budget`, start/stop scheduler-a) |
| Nabavka resursa (OpenRouter, HeyGen, lead krediti) | `/admin` → Resources (`resource-procurement`), politika [`../RESOURCE-PROCUREMENT.md`](../RESOURCE-PROCUREMENT.md) |
| Zdravlje sistema | `GET /api/v1/admin/health`, `alert-system`, `titan-monitor/snapshot` |
| Pozivi u pomoć korisnicima | `/admin` → Onboarding status, retry (`/admin/onboarding-status/:userId/retry`) |

## Bezbednosne napomene

- `helmet`, CORS lista, globalni i per-ruta rate limiteri su uključeni u Express-u; Nest ima `helmet` ali CRUD rute bez guard-a — ne izlagati Nest javno bez dodatnih guard-ova.
- Webhook rute (`/payments/stripe/webhook`, `/payments/kriptoman/webhook`) proveravaju potpis; `webhookLimiter` štiti od poplave.
- `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION` mora biti eksplicitno `true` — to je svestan M0 izbor.
- Tajne: [`../SECRETS-MATRIX.md`](../SECRETS-MATRIX.md), rotacija ključeva pri svakoj promeni tima.
- GDPR: modul `gdpr` (`/gdpr/request`, admin `/gdpr/admin/:id/process`), `compliance_records`; paket `compliance-pack` iz kataloga daje klijentu dokumente.

## Faze (gde smo)

| Faza | Status | Gate |
|------|--------|------|
| M0 „novac odmah” | aktivno | ručna IBAN uplata → fulfillment; DNS API domena; prva potvrđena uplata |
| M1 inbound | u toku | Resend live + ≥1 CRM lead iz kontakt forme |
| M2–M6 | planirano | warm outbound → retaineri → Hunter/Apollo DACH + Stripe (M6) — [`../MESECNI-PLAN-ULAGANJA-M0-M6.md`](../MESECNI-PLAN-ULAGANJA-M0-M6.md), [`../MARKETING-REVENUE-PHASED-CHECKLIST.md`](../MARKETING-REVENUE-PHASED-CHECKLIST.md) |
| Nivo 3 (K8s multi-tenant, prošireni AI) | vizija | [`../../NIVO-3-START.md`](../../NIVO-3-START.md) |

# Monitoring cron — wired + live tested

**Date:** 2026-10-25  
**Verdict:** **PASS**

## What shipped
- `MonitoringSchedulerService` — interval probe suite (default **5 min**)
- Config: `MONITORING_SCHEDULER_ENABLED` (default true), `MONITORING_SCHEDULER_INTERVAL_MS` (default 300000)
- Started from `MonitoringModule.initialize()`; stopped on shutdown
- Admin API: `GET /api/v1/monitoring/scheduler/status`, `POST /api/v1/monitoring/scheduler/tick`
- New `marketing` probe (observe-only; warns when ads sync off)
- Migration `049_monitoring_scheduler_marketing.sql` + runtime `ensureService`

## Live proof (api.omnigrouptech.com)
```
SCHEDULER running=true enabled=true intervalMs=300000 tickCount≥1
lastOverall=OPERATIONAL_WITH_WARNING lastTickOk=true

POST /scheduler/tick → ok=true overall=OPERATIONAL_WITH_WARNING

subsystems after tick:
  api=healthy  database=healthy  redis=healthy  queues=healthy
  web=healthy  payments=healthy  email=healthy  omi=healthy
  reinvestment=healthy  monitoring=healthy
  marketing=warning:marketing_ads_sync_off_observe_only   ← honest soft start
```

Unit: `npx jest src/tests/unit/monitoring-scheduler.test.ts` → **3/3 PASS**

## Portfolio page (anti-scam proof)
- Live: https://omnigrouptech.com/portfolio → **HTTP 200**
- Nav + footer link **Portfolio**
- Live `/sites/…` grouped by industry (public API) + package×industry matrix from factory evidence
- Copy: real deliveries, not mockups; soft IBAN vs Stripe LIVE honesty

## Note
SoftDeploy temporarily used `sk_test_` placeholder in local `deploy.config.json` because P2 gate blocks `sk_live_` without firma — then restored. Live API payments mode remains sandbox/TEST for soft start.

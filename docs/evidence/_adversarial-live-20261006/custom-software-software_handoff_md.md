# Custom Software — Handoff Documentation

_Software starter kit — Client_


## Project overview

Productized starter software: Node API + SPA scaffold with README, .env.example, smoke tests, and handoff PDF (run/deploy) — not a finished custom product or unlimited build hours. for Client (Healthcare): scoped digital delivery with live site, documentation, and invoice trail.

• Client: Client
• Industry context: Healthcare
• Project: Software starter kit
• Stack baseline: Node.js API + static SPA shell (productized starter)
• Scope: starter deliverable complete — not unlimited custom build hours

## Delivered artifacts

1. Source tree at: /app/data/product-factory/client_order/co-ab4462c3993408b5
2. README.md — local run + deploy steps
3. .env.example — copy to .env before start (no secrets committed)
4. tests/enhanced.test.js — smoke tests; fulfillment records testsPassed from real run
5. Handoff PDF + markdown bundle for operators

Acceptance: testsPassed=true from factory test run; build status completed.

## How to run the scaffold

1. cd /app/data/product-factory/client_order/co-ab4462c3993408b5
2. cp .env.example .env  (set JWT_SECRET before shared deploys)
3. npm test
4. npm start
5. Open http://localhost:4100 — curl /health and /api/v1/meta

Day-0 checklist: ☐ .env filled ☐ npm test green ☐ /health 200 ☐ SPA loads

## Architecture

• API routes under src/routes/api.js
• Schema / migrations under src/db/schema.sql
• Config via env (.env.example) — never hardcode credentials
• Static client shell in public/; CORS via CORS_ORIGIN in prod
• Health endpoint /health for uptime probes; structured JSON errors

Extend carefully: add feature flags for risky paths; keep healthz for uptime probes.
Architecture acceptance: ☐ route map ☐ env list ☐ no secrets in git ☐ healthz green

## Deployment runbook

1. Copy tree to host or containerize (Node 20+)
2. Set PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV=production from .env.example
3. Apply src/db/schema.sql if using Postgres
4. npm test && npm start under systemd/PM2/Docker
5. TLS terminator in front; confirm /health and backup job
6. Record deploy timestamp and rollback tag

Rollback: previous image/tag + DB migration down plan. Milestone: first prod deploy with monitored error budget.
Day 0 checklist: ☐ env set ☐ migrate ☐ healthz ☐ TLS ☐ backup job scheduled

## Test plan & milestones

Checklist:
• ☐ Unit/smoke tests green in CI/local (npm test)
• ☐ Auth happy/fail paths when you add auth
• ☐ Critical business flow E2E
• ☐ Backup/restore note for Day 0
• ☐ Week 2: performance snapshot
• ☐ Day 30: change-request backlog triage

Milestones: M1 code delivery · M2 deploy · M3 acceptance sign-off.

## Support & change control

Prepared for Client. Route change requests via dashboard support with acceptance criteria and KPI impact.

• SLA: acknowledge within 1 business day unless retainer says otherwise
• Security issues: escalate immediately; rotate secrets if needed
• Do not ship with placeholder credentials from .env.example

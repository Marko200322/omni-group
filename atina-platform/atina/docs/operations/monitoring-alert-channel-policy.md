# Atina Monitoring Alert Channel Policy

This policy defines production alert thresholds and channel routing for the current admin monitoring surface.

- Primary metrics source: `GET /api/v1/admin/overview`
- Deep-dive reliability source: `GET /api/v1/admin/workflow/templates/execution-stats?days=30`
- Health diagnostics source: `GET /api/v1/admin/health`

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

## 1) Critical Alerts and Thresholds

Thresholds below are based on current admin payload fields and existing in-app alert semantics.

| Alert ID | Metric source | Trigger condition | Severity |
|---|---|---|---|
| `WF_TEMPLATE_SUCCESS_CRITICAL` | `workflowTemplateAlerts.templates[].successRate` and `.threshold` | Any template `successRate < threshold` AND `severity = high` | Critical |
| `WF_TEMPLATE_SUCCESS_MAJOR` | `workflowTemplateAlerts.templates[].successRate` and `.threshold` | Any template `successRate < threshold` with `severity = medium` | High |
| `WF_TEMPLATE_SUCCESS_MINOR` | `workflowTemplateAlerts.templates[].successRate` and `.threshold` | Any template `successRate < threshold` with `severity = low` | Medium |
| `WF_ALERT_DENSITY_HIGH` | `workflowTemplateAlerts.alertRate` | `alertRate >= 30%` over evaluated templates | High |
| `WF_ALERT_DENSITY_MEDIUM` | `workflowTemplateAlerts.alertRate` | `alertRate >= 15%` and `< 30%` | Medium |
| `FORGE_BUDGET_BURN_CRITICAL` | `atinaForgeKpis.budgetBurn.burnPercent` | `burnPercent >= 95` | Critical |
| `FORGE_BUDGET_BURN_MAJOR` | `atinaForgeKpis.budgetBurn.burnPercent` | `burnPercent >= 85` and `< 95` | High |
| `FORGE_PROVIDER_CONCENTRATION` | `atinaForgeKpis.topProvider.sharePercent` with `atinaForgeKpis.forgeRuns24h` | `sharePercent >= 80` and `forgeRuns24h >= 20` | Medium |
| `TASK_FAILURE_RATE_CRITICAL` | `tasks.failed` and `tasks.total` | `(failed / max(total,1)) * 100 >= 20` | Critical |
| `TASK_FAILURE_RATE_MAJOR` | `tasks.failed` and `tasks.total` | `(failed / max(total,1)) * 100 >= 10` and `< 20` | High |
| `LOG_SURGE` | `logs.last24h` | `last24h >= 2x` 7-day baseline | Medium |
| `ADMIN_HEALTH_DEGRADED` | `GET /api/v1/admin/health` => `status`, `database.ok`, `forge.vaultSignal`, `forge.lastForgeEventFresh` | `status != healthy` OR `database.ok = false` OR `forge.vaultSignal = unavailable` OR `forge.lastForgeEventFresh = false` | Critical |

### Notes on Existing Severity Logic

Current API alert severity for workflow templates is derived from threshold gap and trend:

- Gap `>= 30` points below threshold -> `high`
- Gap `>= 15` and `< 30` -> `medium`
- Gap `< 15` -> `low`
- Trend can up-rank (`worsening`) or down-rank (`improving`) one level

This policy keeps those semantics and only adds routing/escalation behavior.

## 2) Alert Routing Requirements (Slack / Email / Pager)

All alerts must include:

- `alertId`, `severity`, `environment`, `service=atina`, `metricPath`, `currentValue`, `threshold`, `detectedAt`
- `dashboardLink` to admin endpoint evidence
- `runbookLink` to this policy and `docs/operations/deploy-rollback-checklist.md`

### Channel Mapping

| Severity | Primary channel | Secondary channel | Paging |
|---|---|---|---|
| Critical | Slack `#ops-critical` | Email to `ops-oncall@atina.io` + `engineering-leads@atina.io` | Pager immediately |
| High | Slack `#ops-alerts` | Email digest every 15 min to `ops-oncall@atina.io` | Pager if unresolved after 15 min |
| Medium | Slack `#ops-alerts` | Email digest hourly | No immediate page |
| Low / info | Slack `#ops-observability` | Optional daily email digest | No pager |

### Delivery SLO

- Slack delivery: <= 60 seconds from alert evaluation
- Email delivery: <= 5 minutes
- Pager delivery: <= 2 minutes for Critical

If any channel misses SLO twice in 24h, raise `ALERT_PIPELINE_DEGRADED` (High).

## 3) Escalation Policy

### Critical

- `T+0`: Send Slack + Email + Pager, assign on-call owner.
- `T+5 min`: If unacknowledged, auto-escalate to secondary on-call.
- `T+15 min`: Escalate to Engineering Manager.
- `T+30 min`: Escalate to Incident Commander + product stakeholder.

### High

- `T+0`: Send Slack + Email.
- `T+15 min`: Page on-call if still firing and unacknowledged.
- `T+30 min`: Escalate to Engineering Manager.

### Medium

- `T+0`: Send Slack.
- `T+60 min`: Escalate via email if still firing.
- `T+1 business day`: Create follow-up issue if recurrent.

### Acknowledgement / Resolution Rules

- Alert owner must acknowledge in Slack thread within 5 minutes for Critical, 15 minutes for High.
- Resolve only after two consecutive healthy evaluations.
- Include remediation note with impacted metric and rollback/no-rollback decision.

## 4) Operational gate: alert channel health checks

Run these checks at least weekly and before every production deploy.

### A. Slack Channel Health

- [ ] Post a synthetic test alert to `#ops-observability`; verify message appears within 60s.
- [ ] Verify bot/app identity and permissions still include `chat:write` and channel membership.
- [ ] Confirm thread replies are enabled and notifications mention on-call handle.
- [ ] Confirm critical route target `#ops-critical` still exists and is not archived.

### B. Email Channel Health

- [ ] Send synthetic alert email to `ops-oncall@atina.io`; confirm inbox delivery <= 5 min.
- [ ] Confirm SPF/DKIM/DMARC pass for the sender domain.
- [ ] Validate distribution lists (`ops-oncall`, `engineering-leads`) contain current members.
- [ ] Verify no active bounces/suppression entries for on-call recipients.

### C. Pager Health

- [ ] Trigger test page in pager service and confirm on-call receives within 2 min.
- [ ] Confirm escalation policy ladder (primary -> secondary -> manager) is active.
- [ ] Confirm quiet hours are disabled for Critical policy.
- [ ] Verify acknowledgement closes the page and syncs state to incident timeline.

### D. End-to-End Alert Pipeline Health

- [ ] Fire one synthetic `Critical` and one `High` test from monitoring evaluator.
- [ ] Confirm both alerts include required payload fields (`alertId`, threshold, current value, links).
- [ ] Confirm dedup key prevents duplicate pages for same condition.
- [ ] Confirm alert recovery message is sent when condition clears.
- [ ] Record evidence (timestamp + screenshot/link) in release notes.

## 5) Pre-Deploy Minimum Gate for Alerting Readiness

Deployment is blocked until all are true:

- [ ] At least one successful synthetic alert per channel (Slack, Email, Pager) in the past 7 days.
- [ ] On-call rotation for current week is populated and verified.
- [ ] Escalation contacts validated and reachable.
- [ ] `ADMIN_HEALTH_DEGRADED` alert route tested in non-prod or controlled prod window.
- [ ] Runbook links in alert payload are valid.

## 6) Release integration gate (Slack/Email/Pager + health)

Use this gate as the final sign-off artifact before each production deploy.

| Item | Slack | Email | Pager | Health check source | Status |
|---|---|---|---|---|---|
| Channel routing verified (`Critical`/`High`/`Medium`) | `#ops-critical`/`#ops-alerts`/`#ops-observability` | on-call + lead distribution | critical + delayed high paging | synthetic alert receipts | Ready |
| Delivery SLO validated | <= 60s | <= 5 min | <= 2 min for Critical | synthetic timestamps in release notes | Ready |
| Escalation ladder active | ack + escalation thread flow | escalation recipients reachable | primary -> secondary -> manager active | pager policy test + incident timeline | Ready |
| Payload quality validated | includes links and IDs | includes links and IDs | includes links and IDs | evaluator output payload inspection | Ready |
| End-to-end recovery signal validated | recovery posted to thread | recovery digest/notice sent | page auto-resolved on ack/recovery | synthetic fire + clear cycle | Ready |

Final gate:

- [ ] Run one Critical synthetic alert and confirm Slack, Email, and Pager all pass SLO.
- [ ] Run one High synthetic alert and confirm Slack + Email delivery and 15-minute pager escalation path.
- [ ] Run `/api/v1/admin/health` and verify `status=healthy`, `database.ok=true`, and fresh Forge signal.
- [ ] Attach evidence links (timestamps/screenshots/log links) to release record.

## 7) Post-Deploy Intensified Monitoring (24-48h) and Incident Readiness

Apply this plan immediately after production deployment.

### Coverage Windows

- **Window A (0-4h):** continuous watch by release team + on-call.
- **Window B (4-24h):** heightened watch with scheduled checks every 30 minutes.
- **Window C (24-48h):** sustained watch with scheduled checks every 60 minutes.

### Minimum Check Cadence

- [ ] `GET /api/v1/admin/health` status and component freshness.
- [ ] `GET /api/v1/admin/overview` trend checks (errors, task failures, log surge).
- [ ] `GET /api/v1/admin/workflow/templates/execution-stats?days=30` alert density and template success.
- [ ] Verify no unresolved Critical/High alerts outside escalation SLO.

### Escalation Timings (Post-Deploy Override)

#### Critical

- `T+0`: Alert fires -> Slack + Email + Pager and incident thread opened.
- `T+3 min`: If unacknowledged, page secondary on-call.
- `T+10 min`: Escalate to Engineering Manager + Release Manager.
- `T+20 min`: Escalate to Incident Commander and evaluate rollback trigger.

#### High

- `T+0`: Slack + Email.
- `T+10 min`: Page on-call if unresolved.
- `T+20 min`: Escalate to Engineering Manager.
- `T+30 min`: Require explicit continue/rollback decision in incident thread.

#### Medium

- `T+0`: Slack.
- `T+30 min`: Escalate via email if still firing.
- `T+60 min`: Create tracked follow-up if recurrent or widening.

### Incident readiness gate (required during 24-48h)

- [ ] Incident commander and deputy listed in ops channel topic/pinned message.
- [ ] Rollback command path and latest snapshot ID are pinned.
- [ ] Alert owner responds within SLA (Critical <= 5 min, High <= 15 min).
- [ ] Every Critical/High incident thread includes decision log (mitigate, monitor, rollback).
- [ ] End-of-window handoff note posted with residual risks and active follow-ups.

## See also

- [Deploy / rollback runbook](./deploy-rollback-checklist.md) — staging/prod flow i smoke.
- Parent monorepo (`omni group`): pun gate kao **CI (monorepo)** (job **`python`**: **`Python (Doslednost dok + pytest)`** na GitHubu — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) lokalno — [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (prvo **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest + **`apps/omnigroup-web`** build osim **`-SkipOmnigroupWeb`**; **`-SkipDocAudit`** samo lokalno; **Port mismatch** za Nest/pg) · [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) (HTTP, opciono; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../../../../scripts/README.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

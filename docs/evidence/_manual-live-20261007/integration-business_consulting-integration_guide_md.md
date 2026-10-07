# Custom Integration Guide

_Client — Business & Consulting_


## API overview

Client (Business & Consulting) integrations should treat Omni REST surfaces as the system of record for payments, deliverables, and portal identity.

Scope honesty: this package is a documented map + integration-config.json — tools are NOT already connected until your developer adds API keys.

• Base path: /api/v1 (JWT bearer)
• Idempotency: send Idempotency-Key on payment-confirm and webhook retries
• Vertical modules in scope: craftor, analytics, crm, contracts, deal-offer
• Industry domain tokens: operating model, stakeholder map, OKR cascade, change readiness
• Error contract: JSON { error, code, requestId } — log requestId for support
• Download integration-config.json for envMap, webhookEndpoints, retryPolicy, and onboardingChecklist

Sequence (happy path): Auth → create/update CRM contact → attach payment reference → await payment.completed webhook → unlock deliverable artifacts.

## Authentication

1. Issue user JWT via login; store refresh token server-side only
2. Scope admin vs client roles; never embed admin tokens in frontends
3. Rotate API keys quarterly; revoke on staff offboarding (Day 0 checklist)
4. Prefer short-lived access tokens (≤1h) with refresh rotation

Acceptance: login, refresh, and forbidden-role probes documented with timestamps.

## Webhooks

Subscribe at minimum to: payment.completed, deliverable.ready, support.ticket.created.

1. Verify HMAC signature header before mutating CRM
2. Return 2xx quickly; process async if heavy
3. Apply retryPolicy from integration-config.json (exponential backoff + dead-letter)
4. Map payment_id ↔ external invoice id in a durable table

Business & Consulting integration notes:
• Decision log events sync to project tracker
• OKR IDs correlate workshops and deliverables
• Portal hosts living operating model, not one-off PDFs only

Industry note: tag webhook payloads with source=business_consulting for reporting (never embed sensitive operating model payloads).

## Email, notifications & payments

• Transactional mail: payment received, deliverable ready, password reset
• Admin notify on failed webhook or stuck fulfillment job
• Manual bank-transfer path remains first-class; Stripe optional
• Never invent merchant IDs — leave placeholders until credentials exist (see envMap)

Payment confirm checklist:
• ☐ Reference code unique
• ☐ Amount/currency match quote
• ☐ Fulfillment job enqueued
• ☐ Client can download artifacts

## Onboarding when you add API keys

Execute this checklist with integration-config.json open (also delivered as integration-onboarding-checklist.md):

1. Store webhookSecret as INTEGRATION_WEBHOOK_SECRET in your vault — never commit it
2. Register webhookEndpoints in Stripe/provider dashboards
3. Fill only the envMap keys you need (Stripe, email, AI) — unused stay blank
4. Implement HMAC verify + retryPolicy; send Idempotency-Key on retries
5. Sandbox E2E: Auth → CRM → payment → artifact unlock using sampleEvents
6. Production cutover: rotate secrets, swap live keys, monitor 24h

Business & Consulting compliance before cutover:
• ☐ Client confidentiality / NDA scope for artifacts
• ☐ Recommendation evidence links retained
• ☐ Decision log owners named for each workstream

Done when: staging E2E green and live keys are not mixed with sandbox.

## Testing & go-live checklist

Quality gates:
• Research complete (TAM + competition in research_data)
• Artifacts generated (module, landing, workflow, outreach, quality pack)
• Dynamic pricing quote valid for verticalSlug
• CRM pipeline and lead source defined
• Outreach draft reviewed before send (domain warmup)
• Smoke test / owner sign-off before client delivery

Go-live milestones:
1. Sandbox webhook echo verified
2. Staging end-to-end purchase → artifact
3. Production keys rotated + secrets scan clean
4. Rollback: disable webhook consumer flag
5. Stakeholder map signed
6. Decision log live
7. Pilot OKRs baseline

Day-1 ops: monitor error rate, p95 webhook latency, failed fulfillment count.

## Security & support runbook

• Rotate webhook secrets after any suspected leak
• Rate-limit public endpoints; CAPTCHA on lead forms if abuse appears
• Escalation: dashboard support → on-call email → incident channel
• ROI hook for Client: fewer manual reconciliations after webhook automation
• Recommendations without owner or KPI
• Stakeholder misalignment kills adoption

Acceptance checklist:
• ☐ Auth probes pass
• ☐ Webhook signature verified in staging
• ☐ Payment → deliverable E2E green
• ☐ Runbook contacts confirmed
• ☐ Business & Consulting integration notes reviewed

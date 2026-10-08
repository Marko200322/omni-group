# Custom Integration Guide

_Client — Hospitality_


## Problems this package addresses

Package integration × industry hospitality — 10 concrete problems (target 5–10):

1. Hospitality tools do not talk to each other — data is copied manually
2. No-shows
3. Chaotic peak ops
4. Missed upsells
5. Ugostiteljstvo SMB market
6. Turnkey delivery for Ugostiteljstvo — no platform resale
7. API gaps between CRM and finance
8. Webhook failures undocumented
9. No integration map for developers
10. Auth notes missing for third-party tools

These map to checkout OmniTrix claims and must appear in the delivered pack — not marketing-only copy.

## API overview

Client (Hospitality) integrations should treat Omni REST surfaces as the system of record for payments, deliverables, and portal identity.

Scope honesty: this package is a documented map + integration-config.json — tools are NOT already connected until your developer adds API keys.

• Base path: /api/v1 (JWT bearer)
• Idempotency: send Idempotency-Key on payment-confirm and webhook retries
• Vertical modules in scope: crm, client-hunter, outreach, automation, billing
• Industry domain tokens: reservation system, occupancy rate, guest journey, upsell attach
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

Hospitality integration notes:
• Reservation ID keys guest CRM and billing
• Housekeeping task webhooks from checkout events
• Consent-checked SMS for confirmations only

Industry note: tag webhook payloads with source=hospitality for reporting (never embed sensitive reservation system payloads).

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

Hospitality compliance before cutover:
• ☐ Guest data retention / privacy for reservations
• ☐ Food safety / allergen notes where applicable
• ☐ No-show and cancellation policy disclosed

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
5. Reservation confirm path live
6. Housekeeping SLA set
7. Upsell script tested

Day-1 ops: monitor error rate, p95 webhook latency, failed fulfillment count.

## Security & support runbook

• Rotate webhook secrets after any suspected leak
• Rate-limit public endpoints; CAPTCHA on lead forms if abuse appears
• Escalation: dashboard support → on-call email → incident channel
• ROI hook for Client: fewer manual reconciliations after webhook automation
• Overbooking without recovery playbook
• Housekeeping SLA misses peak days

Acceptance checklist:
• ☐ Auth probes pass
• ☐ Webhook signature verified in staging
• ☐ Payment → deliverable E2E green
• ☐ Runbook contacts confirmed
• ☐ Hospitality integration notes reviewed
# Integration onboarding checklist

Client: Client

Tools are **not** pre-connected. Execute these steps when you add API keys.

## 1. Store webhookSecret securely

Copy webhookSecret from this JSON into your secrets manager as INTEGRATION_WEBHOOK_SECRET. Do not commit it.

Done when: Secret is in vault / env of the consumer only

## 2. Register webhook endpoints

Point your Stripe (or payment) webhook at https://api.omnigrouptech.com/api/v1/payments/webhooks/stripe. Point internal job status consumers at deliverableReady. Use customIngress for your own systems.

Done when: Provider dashboard shows endpoint + signing secret configured

## 3. Add third-party API keys (only when you go live)

Fill envMap keys that apply (Stripe, email, OpenRouter, etc.). Keys are NOT pre-connected — this pack documents how to wire them.

Done when: Required env vars set in staging; unused keys left blank

## 4. Verify HMAC + retry policy

Implement signature check on inbound webhooks; apply retryPolicy (exponential backoff + dead-letter). Send Idempotency-Key on payment-confirm retries.

Done when: Staging echo returns 2xx; failed deliveries land in DLQ after maxAttempts

## 5. Sandbox end-to-end

Run Auth → CRM contact → payment reference → payment.completed → artifact unlock using sampleEvents payloads.

Done when: E2E green in staging with sandbox keys only

## 6. Production cutover

Rotate webhookSecret, swap live keys, disable sandbox endpoints, monitor p95 latency and failed fulfillment count for 24h.

Done when: Live purchase produces downloadable artifacts; rollback flag documented

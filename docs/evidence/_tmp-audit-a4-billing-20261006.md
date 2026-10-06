# A4 Billing/Stripe — [Billing](17955aa8-eb18-4eb7-ba25-91df89ffd7ab)

**Commercial path: PARTIAL (REAL, not MOCK)**

## Key findings
- Real Stripe SDK + webhook `constructEvent`; PayPal capture APIs real
- Prod evidence historically shows Stripe TEST (`sk_test_` / `cs_test_`) while methods may report live mode → config tension
- Stripe SaaS/deliverable/shop: YES internal state when webhooks fire (`payments.service.ts`)
- PayPal: PARTIAL — subscription/plan only; no invoice/fulfillment on capture
- Manual/Wise: YES after admin confirm; Kriptoman via webhook
- Stripe success page: cosmetic — NO session verification (`dashboard/billing/success`)
- Live card + production webhook E2E: UNVERIFIED

## Answer
Successful payment → correct internal state? **PARTIAL** (provider-dependent; not success-page-dependent)

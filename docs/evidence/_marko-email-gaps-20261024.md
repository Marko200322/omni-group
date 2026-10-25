# Marko email gaps — live probe

Generated: 2026-10-24T22:52:12.449Z
Overall: **PASS_WITH_STRIPE_LIVE_BLOCKED**

## 1) OMI anonymous chat + product recommend
- Verdict: **PASS**
- Session HTTP: 201 · Chat HTTP: 200
- Audience: public
- Catalog ID hits: audit, landing
- Reply preview:

```
What I understand: (price) I run a small healthcare clinic. Leads are inconsistent and our website does not convert. Which Omni Group Tech package should I buy and roughly how much? The main problem: missed inquiries; weak or missing public web presence; traffic without conversion. Why I think this is the bottleneck: it is what you actually described, not a generic industry script. Because the pain is follow-up after interest arrives, I am not steering you to a website rebuild by default. What I would consider: Sales enablement (sales-enablement) at €890 one_time. /products#sales-enablement Why this fits you: It is relevant to conversion and follow-up, not an automatic website rebuild. It does not include: Live sales calls; CRM setup for sales team. You described more than one issue. I wil
```

## 2) Stripe LIVE checkout → webhook → fulfill
- Verdict: **BLOCKED_P2**
- Stripe key prefix observed: `sk_test_`
- Payments mode: `manual`
- Stripe LIVE + firma/VAT is Marko-only P2 (OMNI-FACTORY §C). Soft home uses sk_test_ / manual IBAN. Agent must not flip LIVE keys.
- Proven instead: IBAN manual checkout → mark-sent → confirm → fulfillment (portfolio evidence).

## 3) Industry products / prices / checkout
- Verdict: **PASS**
- Catalog: base=23 sellable=1150 industries=50
- Checkout note: Auth IBAN checkout OK paymentId=1d1a5a41-9388-4ce3-8f88-c772e6574a9a amount=730 currency=EUR intro=true

| Industry | HTTP | Rows | Price min–max | Sample IDs |
|----------|------|------|---------------|------------|
| healthcare | 200 | 5 | 566–1304 | setup-quick__healthcare, setup-full__healthcare, setup-custom__healthcare |
| finance | 200 | 5 | 566–1304 | setup-quick__finance, setup-full__finance, setup-custom__finance |
| technology | 200 | 5 | 566–1304 | setup-quick__technology, setup-full__technology, setup-custom__technology |
| legal | 200 | 5 | 566–1304 | setup-quick__legal, setup-full__legal, setup-custom__legal |
| construction | 200 | 5 | 566–1304 | setup-quick__construction, setup-full__construction, setup-custom__construction |
| retail | 200 | 5 | 566–1304 | setup-quick__retail, setup-full__retail, setup-custom__retail |
| ecommerce | 200 | 5 | 566–1304 | setup-quick__ecommerce, setup-full__ecommerce, setup-custom__ecommerce |
| marketing | 200 | 5 | 566–1304 | setup-quick__marketing, setup-full__marketing, setup-custom__marketing |

Evidence JSON: `C:/dev/omni group/docs/evidence/_marko-email-gaps-20261024.json`
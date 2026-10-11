# Product + Service + Document companion + Invoice (2026-10-08)

**Marko:** klijent ne sme da dobije samo dokument — treba **proizvod + usluga**, dokument da **prati**, plus **faktura/receipt** da se vidi ozbiljnost.

## Code changes

| Area | Change |
|------|--------|
| `commercial-companion.ts` | Shared attach: workspace project + kickoff ticket + portal Billing/Tasks + `commercial-delivery-pack.md` |
| `consulting-doc.handler.ts` | audit / workflow / integration always attach service companion (PDF alone → `partial`) |
| `vertical-growth.handler.ts` | sales-enablement attaches service companion |
| `deliverable-fulfillment.service.ts` | After every handler: load invoice by `payment_id` → `metadata.commercialInvoice` + `invoiceLinked` |
| `fulfillment-quality-checklist.ts` | Fail-closed: `commercial_invoice_linked`, `product_or_service_present`, `service_companion` (doc SKUs) |
| `deliverable-acceptance-contract.ts` | All 20 SKUs require invoice + product/service; doc SKUs require service companion |
| Job API `opsEvidence` | Exposes `invoiceId`, `invoiceNumber`, `invoiceLinked`, `serviceCompanion` |

## Gate semantics

- **Documents accompany** product/service — never replace them.
- **Invoice/receipt** must be linked to the payment and visible under Billing.
- Document-primary SKUs (`audit`, `workflow-design`, `integration`, `sales-enablement`, `bundle-ops-clarity`) must ship project + kickoff ticket + commercial pack.

## Unit proof

```
npx jest --runInBand src/tests/unit/fulfillment-quality-checklist.test.ts
→ Test Suites: 1 passed · Tests: 41 passed
```

Includes fail-closed: audit with only PDF/MD fails `commercial_invoice_linked` + `service_companion` + `product_or_service_present`.

## Deploy / live

| Check | Result |
|-------|--------|
| SafeDeploy | **EXIT 0** (~207s). Log: `_tmp-safedeploy-product-service-invoice-20261008.txt` |
| Prod container | `commercial_invoice_linked` + `commercial-companion.js` + `attachCommercialInvoice` present; `/health` ok |
| Live `audit__healthcare` | **LIVE_PROOF_OK** — see `_tmp-live-product-service-invoice-audit-20261008.json` |

Live job proves: `invoiceLinked`, `kickoffTicketId`, `serviceCompanion`, `commercial-delivery-pack.md`, checklist passed.

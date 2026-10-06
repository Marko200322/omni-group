# Commerce documentation chain — prod proof (2026-10-06)

**Goal:** Prove client sees package documents after pay (invoice/receipt + handoff PDF) for ≥3 package types across ≥2 industries, without Stripe LIVE (manual confirm path).

**Result: PASS (3/3 cells)**

## Verified chain

| Step | Proof |
|------|--------|
| 1. Invoice list includes payment-linked rows | `billing.repository` filter `payment_id IS NOT NULL` (with subscription/stripe OR); unit test + live client `GET /api/atina/billing/invoices` returned matched invoice with `payment_id` |
| 2. Pay → Billing document | Manual checkout → mark-sent → admin confirm creates invoice with `documentKind=payment_receipt` (no firma VAT configured — not invented) |
| 3. Pay → Deliveries PDF | Fulfillment completed; client downloaded `.pdf` artifact (`Content-Type: application/pdf`) |
| 4. Printable receipt labeling | HTML titled **Payment receipt** + VAT disclaimer when legal identity missing |

Stripe TEST session create proven on each cell; delivery used manual confirm (same post-pay hook as webhook).

## Cells (prod `https://omnigrouptech.com`)

| Package | Industry | Payment | Invoice | Doc kind | PDF | Bytes |
|---------|----------|---------|---------|----------|-----|-------|
| `setup-quick` | marketing | `da3ca56c-70f4-434a-baee-56e3cbaaf48e` | `INV-202610-3709` (`e14c5987-…`) | payment_receipt | `setup-quick.pdf` | 4108 |
| `audit` | technology | `925e3ffd-72b8-4ad2-a8f9-469ff1da4c7e` | `INV-202610-3712` (`72844917-…`) | payment_receipt | `technical-audit.pdf` | 7293 |
| `landing` | technology | `6ed32223-5f3b-4b66-bfa9-42560c356cfc` | `INV-202610-3714` (`c27f0bc7-…`) | payment_receipt | `landing-delivery.pdf` | 3016 |

Raw JSON: [`commerce-docs-chain-prod-20261006-101718.json`](./commerce-docs-chain-prod-20261006-101718.json)  
Run log: [`commerce-docs-chain-prod-20261006-101718.log`](./commerce-docs-chain-prod-20261006-101718.log)

Command pattern:

```powershell
.\scripts\e2e-commerce-prod.ps1 -DeliverableId <id> -IndustryCategory <industry>
```

## Gaps fixed during this run

1. **PDF/MD download 500** — `Content-Disposition` used non-ASCII `downloadLabel` (en-dashes in package titles). Node rejects non-ByteString headers. Fixed with RFC 5987 ASCII `filename` + `filename*=UTF-8''…` in `billing.controller.ts`. Deployed via `deploy-atina-api-only.ps1`.
2. **Artifacts wiped on API recreate** — `data/client-deliverables` lived on ephemeral container FS. Added named volume `deliverable_data` → `/app/data/client-deliverables` in `docker-compose.prod.yml` and recreated API.
3. **E2E coverage** — `e2e-commerce-prod.ps1` now asserts invoice list (`payment_id`), printable receipt label, and client PDF download (not only fulfillment job status).

## Remaining gaps

| Gap | Severity | Notes |
|-----|----------|--------|
| Firma / company VAT identity | Expected | `COMPANY_TAX_ID` / legal name empty → documents correctly labeled **Payment receipt**, not tax invoice. Do not invent VAT. |
| Stripe LIVE | Deferred (owner) | Sessions are TEST (`livemode=false`, `mode=sandbox`). Card capture + live webhook not run. |
| Portal UI “Billing documents” copy | Low | `InvoiceHistoryPanel` receipt labeling is in repo; needs web SafeDeploy to show on prod portal list (printable HTML already says Payment receipt). |
| `audit@technology` projects list | Low | Invoice + PDF OK; `projects=0` for that cell (audit may not always open a client_order project). |
| Pre-volume historical PDFs | Low | Artifacts created before `deliverable_data` volume may 404 after recreate; new purchases persist. |
| Path check hardening | Low | `path.relative` hardening in read service is local; optional follow-up API rebuild. |

## Code anchors

- Invoice visibility filter: `atina-platform/atina/src/modules/billing/repository/billing.repository.ts` (`payment_id IS NOT NULL`)
- Receipt vs tax invoice: `payments.service.ts` `documentKind: hasVatIdentity ? 'tax_invoice' : 'payment_receipt'`
- Printable label: `apps/omnigroup-web/src/app/api/atina/billing/invoices/[id]/route.ts`
- Artifact download disposition: `billing.controller.ts` `buildAttachmentContentDisposition`
- Persist artifacts: `docker-compose.prod.yml` volume `deliverable_data`

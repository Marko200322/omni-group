# Payments / legal readiness audit

**Scope:** `C:\dev\omni group` — read-only. Manual IBAN confirmed working per your note and `docs/ADMIN-JEDNA-LISTA.md`.

---

## Wiring completeness (code paths)

| Provider | Backend | Web BFF | Config / deploy | Runtime status |
|----------|---------|---------|-----------------|----------------|
| **Manual IBAN** | `C:\dev\omni group\atina-platform\atina\src\modules\payments\service\payments.service.ts` | `C:\dev\omni group\apps\omnigroup-web\src\components\platform\BillingCheckoutPanel.tsx` | `deploy-secrets.local\deploy.config.template.json` → `manualPayment.*`; mirrored by `C:\dev\omni group\scripts\apply-integration-keys.ps1` | **Complete — working** |
| **Stripe (cards)** | Same service + `C:\dev\omni group\atina-platform\atina\src\modules\payments\controller\payments.controller.ts`; webhook raw body in `C:\dev\omni group\atina-platform\atina\src\core\CoreEngine.ts` (`/api/v1/payments/stripe/webhook`) | `C:\dev\omni group\apps\omnigroup-web\src\app\api\atina\payments\stripe\checkout\route.ts` | `C:\dev\omni group\atina-platform\atina\src\config\index.ts` (`FINANCE_KEY` / `STRIPE_*`, price IDs); `C:\dev\omni group\scripts\deploy-config-env.ps1`; checker `C:\dev\omni group\scripts\check-stripe-env.ps1` | **Code complete — not enabled in prod config** |
| **PayPal** | `payments.service.ts` (`createPayPalOrder` / `capturePayPalOrder`); optional proxy via `C:\dev\omni group\atina-platform\atina\src\integrations\finance-client.ts` | `C:\dev\omni group\apps\omnigroup-web\src\app\api\atina\payments\paypal\order\route.ts`, `...\paypal\capture\[orderId]\route.ts`, `...\dashboard\billing\paypal\success\page.tsx` | `.env.example` only — **not** in `deploy.config.template.json` | **Code complete — keys empty; capture is client-driven (no PayPal webhook handler)** |
| **Wise** | `payments.service.ts` (`createWiseTransfer` → DB pending + admin confirm) | `C:\dev\omni group\apps\omnigroup-web\src\app\api\atina\payments\wise\transfer\route.ts` | `WISE_API_KEY` / `WISE_PROFILE_ID` in `config\index.ts` | **Incomplete wiring:** keys are defined but **never read**; flow falls back to same manual IBAN instructions unless `FINANCE_URL` aggregator responds. **Not card payments.** |

Payment method gating: `getPaymentMethods()` in `payments.service.ts` — Stripe/PayPal/Wise only appear when `PAYMENTS_MODE !== 'manual'`.

Factory phase: M6 expects live Stripe — `C:\dev\omni group\atina-platform\atina\src\modules\billing\lib\factory-phase-modules.ts` (gaps at `PAYMENTS_MODE≠live`). Current ops doc: `factoryPhase: M4`, Stripe EMPTY — `C:\dev\omni group\docs\ADMIN-JEDNA-LISTA.md`.

---

## What blocks **card payments**

1. **`PAYMENTS_MODE=manual`** (default in `C:\dev\omni group\atina-platform\atina\.env.example`, `C:\dev\omni group\scripts\prepare-vps-prod.ps1`) — hides Stripe/PayPal in UI/API.
2. **Empty Stripe stack** — `stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`, `starter/pro/enterprisePriceId` EMPTY in deploy checklist (`docs\ADMIN-JEDNA-LISTA.md` #4).
3. **`FINANCE_KEY` / `STRIPE_SECRET_KEY` unset** — `requireStripe()` throws (`payments.service.ts`).
4. **Placeholder price IDs** — defaults `price_starter` / `price_pro` / `price_enterprise` rejected unless real IDs or dynamic pricing with `industryCategory`.
5. **Factory phase M4, not M6** — live card path tied to M6 + `PAYMENTS_MODE=live` (`scripts\prod-factory-phase.ps1` sets live only when `stripeSecretKey` present at M6).
6. **Stripe Dashboard ops (external)** — live account, EUR products/prices, webhook to `https://<api-host>/api/v1/payments/stripe/webhook` (`docs\NIVO-2-STAGING-WEBHOOKS.md`; note doc says `/payments/webhook` but code uses `/payments/stripe/webhook`).
7. **`WEB_APP_URL`** must match prod domain for return URLs (`config\index.ts`).
8. **Prod guard:** `PAYMENTS_MODE=manual` in production throws unless `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true` (`config\index.ts` lines 532–539).

PayPal is **not** primary card rail; it uses **USD** in code while plans bill **EUR**. Wise is **bank transfer**, not cards.

---

## What blocks **proper Serbian invoices**

### Config / data (owner)

| Gap | Path |
|-----|------|
| Company legal name, PIB, address **EMPTY** | `deploy-secrets.local\deploy.config.template.json` (`companyLegalName`, `companyTaxId`, `companyAddress`); checklist `docs\ADMIN-JEDNA-LISTA.md` #3 |
| Env mapping exists but fields not in `.env.example` | `COMPANY_*` wired in `config\index.ts`, `scripts\deploy-config-env.ps1`, `scripts\apply-integration-keys.ps1`, `scripts\prod-factory-phase.ps1` |
| No **matični broj (MBR)** field anywhere | — |
| Registered **DOO + PDV** status (business, not code) | `docs\VLASNIK-DOSTAVA.md` §3 |

### Invoice content (product gaps)

| Gap | Path |
|-----|------|
| **English-only** templates (“Invoice”, “Proforma invoice”, `en-US` dates) | `atina-platform\atina\src\modules\payments\templates\invoice-email.template.ts`, `apps\omnigroup-web\src\lib\invoice-email-template.ts` |
| Issuer block (PIB/adresa) only on **manual proforma email**, if `COMPANY_*` set | `invoice-email.template.ts` (`renderManualCheckoutInvoiceEmail`) |
| **Paid invoice email + PDF omit issuer legal block entirely** | `renderPaidInvoiceEmail`; `atina-platform\atina\src\modules\payments\service\invoice-pdf.service.ts` |
| Proforma PDF disclaimer: *“not a tax invoice until payment is confirmed”* | `invoice-pdf.service.ts` |
| **`taxAmount` always 0** — no PDV/VAT line on create | `billing.service.ts` (`createInvoice`); callers in `payments.service.ts` never pass `taxAmount` |
| Internal tax reserve only (not invoice VAT) | `revenue-allocation.service.ts` + `OWNER_TAX_RESERVE_RATE` (default **0** in `config\index.ts`; `.env.example` shows 0.15) |
| **No eFaktura / fiscal printer / SEF integration** | — |
| Numbering `INV-YYYYMM-####` / `PRO-YYYYMM-*` — not verified against RS fiscal rules | `billing.service.ts`, `payment-notifications.service.ts` |

Preview (samples, not prod data): `apps\omnigroup-web\src\app\(marketing)\invoices\preview\`.

### Invoice email delivery

| Gap | Path |
|-----|------|
| Invoice PDFs use **SMTP with attachments**; COMMS aggregator skips attachments | `atina-platform\atina\src\modules\payments\service\payment-notifications.service.ts`, `notifications.service.ts` |
| `SMTP_ENABLED=false` by default; deploy template `smtp.enabled: false` | `.env.example`, `deploy.config.template.json` |
| Resend on web is for **contact form**, not Atina billing PDFs | `docs\ADMIN-JEDNA-LISTA.md` (Resend OK for contact) |

Legacy separate stack (not main platform): `C:\dev\omni group\sistem_naplate\`.

---

## Ordered steps (no code changes)

### A — Serbian invoices (can parallel IBAN sales)

1. Register firm → fill `companyLegalName`, `companyTaxId`, `companyAddress` (+ MBR in address text until a dedicated field exists) in `deploy-secrets.local\deploy.config.json`.
2. Run `C:\dev\omni group\scripts\apply-integration-keys.ps1` → redeploy (`scripts\deploy-from-local-secrets.ps1` or your VPS flow).
3. Enable **Atina SMTP** (`SMTP_ENABLED`, host, user, password, `EMAIL_FROM` on your domain) **or** COMMS with attachment support — required for proforma/paid PDF emails.
4. Smoke: manual checkout → confirm proforma email shows Issuer + IBAN; admin Confirm → paid invoice email + PDF.
5. **Business/legal (outside repo):** PDV treatment, proper RS invoice numbering, eFaktura/SEF if in PDV — current templates are **commercial receipts**, not fiscal documents.

### B — Card payments (Stripe)

6. Stripe **live** account + business verification tied to registered company.
7. Create EUR Products/Prices → copy IDs to `deploy.config.json` (`starterPriceId`, `proPriceId`, `enterprisePriceId`) + `stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`.
8. Set `factoryPhase: M6` (or keep M4 but force `PAYMENTS_MODE=live` via `prod-factory-phase.ps1` when keys present).
9. Register webhook → `https://api.<domain>/api/v1/payments/stripe/webhook`; test per `docs\NIVO-2-STAGING-WEBHOOKS.md`.
10. Run `scripts\check-stripe-env.ps1`; redeploy; verify `GET /api/v1/payments/methods` exposes `stripe`; end-to-end checkout on prod.
11. Optional: set `OWNER_TAX_RESERVE_RATE` for internal allocation after first live revenue.

### C — PayPal / Wise (optional)

12. **PayPal:** add keys to `KLJUCEVI-POPUNI.local.txt` / `.env`; set `PAYPAL_MODE=live`; note USD vs EUR mismatch; test capture flow via dashboard success page.
13. **Wise:** treat as **manual IBAN variant** today; `WISE_API_KEY` does nothing without a `FINANCE_URL` aggregator implementing `/v1/wise/transfers`.

---

## Quick reference — key files

```
C:\dev\omni group\atina-platform\atina\src\modules\payments\service\payments.service.ts
C:\dev\omni group\atina-platform\atina\src\config\index.ts
C:\dev\omni group\atina-platform\atina\src\modules\payments\templates\invoice-email.template.ts
C:\dev\omni group\atina-platform\atina\src\modules\payments\service\invoice-pdf.service.ts
C:\dev\omni group\atina-platform\atina\src\modules\payments\service\payment-notifications.service.ts
C:\dev\omni group\deploy-secrets.local\deploy.config.template.json
C:\dev\omni group\scripts\check-stripe-env.ps1
C:\dev\omni group\scripts\apply-integration-keys.ps1
C:\dev\omni group\docs\ADMIN-JEDNA-LISTA.md
```

[REDACTED]

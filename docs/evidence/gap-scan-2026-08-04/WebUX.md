# Client-facing gap audit — `apps/omnigroup-web`

Findings ordered by **client impact** (trust, conversion, payment, compliance). No code was changed.

---

## 1. Legal/compliance not production-ready (Critical)

**Terms and Privacy are explicit templates**, not binding counsel-approved copy. Both pages warn operators to replace them before launch.

- `C:\dev\omni group\apps\omnigroup-web\src\app\(marketing)\legal\terms\page.tsx` — line 16: *"Template for launch — replace with counsel-approved text…"*
- `C:\dev\omni group\apps\omnigroup-web\src\app\(marketing)\legal\privacy\page.tsx` — line 16: *"Template for launch — replace with counsel-approved text for your jurisdiction (EU GDPR / local law)."*

**Missing legal surfaces:**
| Gap | Evidence |
|-----|----------|
| No cookie policy / consent UI | No `/legal/cookies`; no `CookieBanner`/`CookieConsent` anywhere; app sets `og_session` + `og_csrf` (`auth-session.ts`, `bff-csrf.ts`, `middleware.ts`) |
| No refund / cancellation / withdrawal policy | No matches for refund/cancellation/withdrawal in app |
| No registered company details on legal pages | Footer (`Footer.tsx`) has no legal entity, address, PIB/MB, or registration number |
| Terms still describe bank-transfer-only checkout | `terms/page.tsx` §2: *"Until card payments are enabled, payment may be completed by bank transfer (IBAN)…"* while billing UI advertises card/PayPal/crypto |

Footer links only Terms + Privacy: `C:\dev\omni group\apps\omnigroup-web\src\components\Footer.tsx`

---

## 2. Contact form can fail silently in production (Critical)

In prod, if **no delivery channel** is configured, submissions return **503**:

- `C:\dev\omni group\apps\omnigroup-web\src\app\api\contact\route.ts` — lines 79–84: without `RESEND_API_KEY` **and** without CRM/Slack/Telegram success → `contact_delivery_unconfigured`
- User-facing error: `ContactForm.tsx` line 103 — *"Contact delivery is not configured on the server."*

`.env.production.example` leaves delivery empty by default:

- `RESEND_API_KEY=` (empty)
- `CONTACT_CRM_INGRESS_EMAIL=` / `CONTACT_CRM_INGRESS_PASSWORD=` (empty)
- `CONTACT_SLACK_WEBHOOK_URL=` (empty)

Telegram fallback exists in code but is **not documented** in prod example:

- `C:\dev\omni group\apps\omnigroup-web\src\lib\contact-telegram-notify.ts` — uses `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (undocumented in `.env.production.example`)

CRM ingress is optional and skipped when unset:

- `C:\dev\omni group\apps\omnigroup-web\src\lib\contact-crm-ingress.ts` — lines 19–22

---

## 3. Checkout is manual-first; Stripe UI is misleading on deliverables (High)

**Default prod profile is lean / manual:**

- `C:\dev\omni group\apps\omnigroup-web\.env.production.example` — `NEXT_PUBLIC_PROD_MODE=lean`
- `C:\dev\omni group\apps\omnigroup-web\src\lib\factory-phase-guard.ts` — `stripe_live` gated to **M6**
- `C:\dev\omni group\apps\omnigroup-web\src\lib\marketing-plans.ts` — line 36: *"Manual / bank transfer billing (no Stripe company required)"*

**Subscription billing** (`BillingCheckoutPanel`) correctly shows Stripe only when API reports it available:

- `C:\dev\omni group\apps\omnigroup-web\src\components\platform\BillingCheckoutPanel.tsx` — lines 323–476, 510–513

**Deliverable checkout** (primary “New order” flow) is **always manual**, even when user picks “Stripe”:

- `DeliverableQuotePanel.tsx` — payment dropdown includes Stripe (lines 35–38, 203–216)
- But checkout always POSTs to `/api/atina/payments/manual/deliverable-checkout` (lines 97–106)
- No BFF route for Stripe deliverable checkout (only `manual/deliverable-checkout` + `stripe/checkout` for plans)

**Lean mode disables many packages** — clients see “Checkout disabled (lean)”:

- `DeliverableQuotePanel.tsx` — lines 235, 90–92
- Gating: `C:\dev\omni group\apps\omnigroup-web\src\lib\package-delivery-spec.ts` — `canCheckoutPackage()` / `leanCheckout`

Manual flow requires **admin confirmation within ~24h**:

- `BillingCheckoutPanel.tsx` — line 621
- `DeliverableQuotePanel.tsx` — line 280

---

## 4. Invoice / company fields — issuer OK, buyer missing (High)

**Issuer fields** (legal name, tax ID, address) are rendered in email/HTML invoices **only if present in Atina payment instructions** — not collected from clients in the web app:

- `C:\dev\omni group\apps\omnigroup-web\src\lib\invoice-email-template.ts` — lines 232–239 (`companyLegalName`, `companyTaxId`, `companyAddress`)

**Preview sample omits issuer legal fields** (only IBAN/account):

- `C:\dev\omni group\apps\omnigroup-web\src\lib\invoice-preview-samples.ts` — lines 43–49

**Buyer billing data:**
| Where | Company field |
|-------|---------------|
| Register | Optional — `register/page.tsx`, `api/auth/register/route.ts` |
| Contact form | Optional — `ContactForm.tsx` |
| Checkout (plans + deliverables) | **None** — no VAT/tax ID/billing address |
| Dashboard account | **None** — only name, email, plan (`DashboardClient.tsx` lines 317–329) |

Session does not carry company (`auth-session.ts` has no `company` field) — registered company is sent to Atina but not shown back to the client.

---

## 5. Client billing portal is thin (High)

- **Only latest invoice** fetched: `api/atina/billing/summary/route.ts` — `limit=1`
- **No invoice list, download, or re-send UI** in dashboard (grep shows no client invoice download)
- Success page promises email PDF: `dashboard/billing/success/page.tsx` — line 20 — but portal has no invoice viewer
- Public invoice preview exists but is **noindex** dev/marketing artifact: `(marketing)/invoices/preview/page.tsx`

Clients see subscription summary + one invoice number in `BillingCheckoutPanel`; no full billing history.

---

## 6. Missing / incomplete prod environment (High — ops affects clients)

**Required for safe prod startup:**

| Variable | Status |
|----------|--------|
| `SESSION_SECRET` (≥32 chars) | Enforced at boot — `instrumentation.ts`; placeholder values throw |
| `NEXT_PUBLIC_SITE_URL` | Required for SEO; falls back to `https://omnigroup.example` — `sitemap.ts`, `robots.ts` |
| `RESEND_API_KEY` + `CONTACT_EMAIL_FROM/TO` | Empty in `.env.production.example`; needed for contact email |
| `CONTACT_CRM_INGRESS_*` or Slack/Telegram | Recommended prod fallback for contact; CRM/Slack empty in example |
| `COOKIE_SECURE=true` | Documented for HTTPS prod |
| `ATINA_API_BASE` | Server-side BFF; documented in prod example |
| `UPLOAD_DIR` + volume | Documented; client document uploads depend on this — `upload-storage.ts`, `FileUploadPanel.tsx` |

**Used in code but missing from `.env.production.example`:**

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_TELEGRAM_NOTIFY` — `contact-telegram-notify.ts`
- `NEXT_PUBLIC_FACTORY_PHASE`, `NEXT_PUBLIC_FACTORY_PHASE_AUTO` — `factory-phase.ts` (controls checkout visibility)
- `NEXT_PUBLIC_MONTHLY_BUDGET_EUR` — `prod-budget.ts` (defaults 200 EUR)
- `ALLOW_DEMO_AUTH` — blocks demo login in prod unless `true` — `middleware.ts`, `api/auth/demo/route.ts`
- `BFF_AUTH_RATE_LIMIT_MAX` — `middleware.ts`

**Atina-side payment keys** (Stripe/PayPal/Kriptoman) are referenced in UI error copy but live in Atina `.env`, not web:

- `BillingCheckoutPanel.tsx` — line 512: *"set PAYMENTS/STRIPE/PAYPAL in Atina .env"*

---

## 7. Admin dashboard gaps that block client fulfillment (Medium–High)

Admin UI is rich, but **pending payment queues are manual-only**:

- `AdminPendingPaymentsPanel.tsx` — line 45: `provider=manual`
- `admin/page.tsx`, `admin/mobile/page.tsx` — same filter

Stripe/PayPal/Kriptoman payments awaiting review **won’t appear** in these panels → slower client activation.

**Lean prod hides major modules** from admin (expected, but limits operator tools):

- `AdminClient.tsx` — Product Factory hidden (lines 351–357); Hunting/Autonomy gated by factory phase

**CRM is admin-only** — no client-facing CRM:

- `AdminClient.tsx` — `#crm` section with `CrmContactsPanel`
- Website leads only appear after `CONTACT_CRM_INGRESS_*` is configured
- `CrmContactsPanel.tsx` — line 178: empty state explains ingress dependency

Mobile admin (`admin/mobile/`) covers overview, manual payments, factory, actions — reasonable but same manual-payment blind spot.

---

## 8. Contact / CRM flow (Medium)

**Working pieces:**
- Contact form with service/category/vertical prefill — `ContactForm.tsx`
- Multi-channel notify: Resend → CRM ingress → Slack → Telegram — `api/contact/route.ts`

**Gaps:**
- No client-visible ticket/lead status after submit
- No SLA or auto-reply beyond success message
- CRM panel requires Pro plan / live API — error: *"Pro plan required or API offline"* — `CrmContactsPanel.tsx` line 174
- Telegram notify text is Serbian-only — `contact-telegram-notify.ts` (operator-facing, minor)

---

## 9. TODO / FIXME / technical debt markers (Low)

**No meaningful TODO/FIXME in client-facing source.** Grep found only:
- `.env.example` placeholder comment
- `dev/docs/page.tsx` reference to `scripts/scan-todo-markers.ps1`

Notable **non-TODO** placeholders affecting clients:
- `PlatformShell.tsx` — search input *"Search (coming soon)"* (line 276)
- `platform-metrics.ts` — demo placeholder tasks/notifications when unauthenticated (lines 215–249)
- `ClientSiteView.tsx` — *"Content coming soon."* (generated client sites)

---

## 10. SEO / discoverability minor gaps (Low)

- Legal pages **not in sitemap** — `sitemap.ts` `PUBLIC_ROUTES` omits `/legal/terms`, `/legal/privacy`
- Default `NEXT_PUBLIC_SITE_URL` → `omnigroup.example` if unset (bad canonical URLs in prod)

---

## Summary matrix

| Area | Status | Top path(s) |
|------|--------|-------------|
| Legal pages | ⚠️ Template only; missing cookie/refund/impressum | `legal/terms/page.tsx`, `legal/privacy/page.tsx`, `Footer.tsx` |
| Invoice/company fields | ⚠️ Issuer from Atina env; no buyer VAT/address in UI | `invoice-email-template.ts`, `DashboardClient.tsx`, checkout panels |
| Stripe vs manual | ⚠️ Manual default; Stripe on plans only; deliverable Stripe dropdown is cosmetic | `BillingCheckoutPanel.tsx`, `DeliverableQuotePanel.tsx`, `factory-phase-guard.ts` |
| Admin dashboard | ✅ Broad; ⚠️ manual-only payment queue | `AdminClient.tsx`, `AdminPendingPaymentsPanel.tsx` |
| Contact/CRM | ⚠️ Prod fails without env; CRM admin-only | `api/contact/route.ts`, `contact-crm-ingress.ts`, `CrmContactsPanel.tsx` |
| TODO/FIXME | ✅ Clean in app source | — |
| Prod env | ⚠️ Several required/used vars empty or undocumented | `.env.production.example`, `instrumentation.ts`, `contact-telegram-notify.ts` |

**Recommended fix order for client impact:** (1) legal + cookie compliance → (2) contact delivery env → (3) align checkout UX with actual payment rails (remove/fix Stripe on deliverables) → (4) buyer billing fields + invoice history in portal → (5) admin queues for all payment providers → (6) prod env checklist completion.

[REDACTED]

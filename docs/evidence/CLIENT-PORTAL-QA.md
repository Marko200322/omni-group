# Klijentski portal — checklist pre starta

**Updated:** 2026-09-23

Mapiranje stavki sa launch review-a na **kod / test / ručno**.

| Stavka | U kodu | Automatski test | Ručno (ti) |
|--------|--------|-----------------|------------|
| **Neulogovan → /dashboard** | `middleware.ts` + `dashboard/layout.tsx` → `/login?next=` | — | Otvori incognito `/dashboard` |
| **Sesija istekla** | BFF cookie `og_session` TTL **7 dana**; Atina JWT refresh u sesiji | — | Ostavi tab, simuliraj brisanje cookie → ponovni login |
| **RBAC / IDOR fakture** | Atina `getInvoiceById(id, userId)` filtrira vlasnika | unit + API auth | Dva klijenta: ne sme tuđi `invoice` ID |
| **RBAC fulfillment** | `getJob(paymentId, userId, role)` | matrix E2E | Promena `paymentId` u URL-u BFF |
| **Stripe webhook → Plaćeno** | `payments.service` `constructEvent` + `confirmPendingPayment` | unit | **Stripe TEST** na prod; **LIVE** tek posle P2 |
| **Manual bank → Plaćeno** | Admin confirm → isti tok kao matrix | e2e-billing-prod **PASS** | Jednom kroz UI |
| **Prazan dashboard** | Copy: „No active projects yet…“ + demo banner | — | Novi invite user, prvi login |
| **Mobilni portal** | `PlatformShell`, tabele u panelima | — | Telefon: `/dashboard`, billing, orders |
| **Footer „Omi“** | Asistent **samo** na `/dashboard` (ne marketing) | — | Refresh marketing home |
| **Javni email** | `hello@omnigrouptech.com` ako je u config samo Gmail | deploy sync | Proveri footer nakon SafeDeploy |
| **Faktura klijentu PDF** | `sendInvoiceConfirmationToClient` + PDF | 27 unit + P0-06 **PASS** | Proveri inbox + portal Billing |

## Profesionalni email

- **Sajt (footer/kontakt):** `NEXT_PUBLIC_SUPPORT_EMAIL` → domen (`hello@…`), ne Gmail u UI.
- **Routing (interno):** `CONTACT_EMAIL_TO` može ostati Gmail za obaveštenja tebi.
- **Resend From:** `CONTACT_EMAIL_FROM` / `send.omnigrouptech.com` — faktura ide **na email klijenta** iz naloga, ne na Gmail osim ako je klijent taj nalog.

## Brze komande

```powershell
.\scripts\e2e-billing-prod.ps1 -DeliverableId setup-quick -IndustryCategory admin_support
.\scripts\audit-prod-autonomous.ps1   # P0-06 inbox PDF
```

---

## Backend, email, SEO, admin (launch checklist 2)

| Stavka | Status |
|--------|--------|
| Auth rate limit (Atina) | **DA** — `authLimiter` + `passwordResetLimiter` na login/register/forgot |
| Auth rate limit (BFF) | **DA** — `middleware.ts` + forgot 10/h |
| Validation | **DA** — Zod DTO + `validateBody` na Atina; BFF osnovna validacija |
| 500 → klijent | **DA** — prod: generički „Internal server error“, stack samo u logu |
| Resend/SMTP | **DA** — Resend primary, SMTP fallback; kontakt + fakture |
| Reset lozinke mail | **DA** — Atina `forgotPassword` → link na `/reset-password` |
| Verifikacija emaila | **DELimično** — token u DB + ruta `/verify-email/:token`, **nema automatskog maila posle register** (invite/admin flow) |
| Admin obaveštenje uplata | **DA** — Slack ops + `notifyAdminPaymentPending` + in-app |
| DKIM/SPF/DMARC | **PASS** na prod auditu (Resend + DMARC) |
| Open Graph slika | **GAP** — OG title/desc **DA**, **`og:image` nije podešen** (WhatsApp/LinkedIn slab preview) |
| Favicon | **DA** — `/icon.svg` (brend, ne Next default) |
| Manifest | **DA** — `/manifest.json` |
| Tajni ključevi u frontend | **OK** — nema `pk_test` u repo; Stripe session preko BFF |
| Admin → klijent status | **Delimično** — isti API; dashboard **nema auto-poll** (refresh stranice) |
| Upload fajlova | **Auth obavezan**; VPS **local disk** (`data/uploads`); artifact download preko BFF + JWT |

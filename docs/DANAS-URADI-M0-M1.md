# Danas uradi — M0 + M1 (novac + klijenti)

**Jedna strana.** Sve ispod je ono što **samo ti** možeš završiti na hostu/nalogu. Kod iz repoa za M0/M1 gapove je već urađen (billing mount, CRM BFF, kontakt → CRM, task `send_email` wire, BFF moduli, seed `titan-score`/`deal-offer`).

**Vreme:** ~2–4 h prvi put · ~30 min posle DNS-a.

---

## Redosled (ne preskači)

### 1. DNS — `api.omnigrouptech.com` (P0)

| Polje | Vrednost |
|-------|----------|
| Tip | **A** |
| Host | `api` |
| Vrednost | `5.189.184.103` |
| TTL | 300–3600 |

```powershell
.\scripts\verify-production-dns.ps1
```

**Pass:** `omnigrouptech.com` OK + `api.omnigrouptech.com` resolve na VPS IP.

---

### 2. Ključevi — popuni pa sync

1. Otvori `atina-platform/atina/KLJUCEVI-POPUNI.local.txt`
2. Minimum za M1:
   - `RESEND_API_KEY` (web + Atina)
   - `SLACK_WEBHOOK_URL`
   - `MANUAL_PAYMENT_IBAN` + `MANUAL_PAYMENT_ACCOUNT_NAME`
3. Web: `apps/omnigroup-web/.env.local` → `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO`, `SESSION_SECRET` (≥32)

```powershell
.\scripts\apply-integration-keys.ps1
.\scripts\check-atina-aggregators.ps1
.\scripts\test-contact-resend.ps1
```

**Pass:** kontakt forma → `sent_via_resend` ili `crm_ok_email_failed` (CRM OK).

---

### 3. Deploy prod

```powershell
.\scripts\deploy-from-local-secrets.ps1
.\scripts\smoke-platform-full.ps1 -WebBase https://omnigrouptech.com -Password <admin>
```

**Pass:** 32/32 smoke.

---

### 4. Prva uplata (M0 gate)

1. Otvori `https://omnigrouptech.com/pricing` → izaberi paket → manual checkout
2. Uplati na IBAN iz admin panela
3. Admin → **Confirm** uplatu
4. Proveri fulfillment u admin panelu (deliveries)

**Pass:** status `fulfilled` + checklist PASS za paket.

---

### 5. Prod env hardening (5 min)

U `atina-platform/atina/.env.vps.prod` (gitignored):

- `JWT_SECRET` / `JWT_REFRESH_SECRET` — ≥32, ne placeholder
- `ADMIN_PASSWORD` — jaka lozinka
- `OUTREACH_DEV_SEND_TO_FALLBACK=false`
- `AUTONOMY_EVOLUTION_CODE_EDIT=false`
- Nikad `RATE_LIMIT_DISABLED=true`

Web prod:

- `NEXT_PUBLIC_ATINA_API_BASE=https://api.omnigrouptech.com`
- `NEXT_PUBLIC_SITE_URL=https://omnigrouptech.com`

---

### 6. CEO evidencije (kad gore prođe)

Popuni redom:

1. [`docs/GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) — branch protection
2. [`docs/TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) — Nest samo ako koristiš Nest u prod
3. [`docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) — Atina prod gate

Označi `[x]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

---

## Šta je već u kodu (ne radi ponovo)

| Stavka | Status |
|--------|--------|
| Fulfillment 17 paketa | ✅ |
| BillingCheckoutPanel + `#billing` | ✅ |
| Kontakt → CRM | ✅ |
| BFF: titanis, outreach, deal-offer, titan-score, digital-signature, package-pricing, omnitube | ✅ |
| Task `send_email` + automation HTTP | ✅ |
| Seed titan-score, deal-offer, outreach, marketing-growth | ✅ |
| Public-site ecommerce catalog bootstrap | ✅ |
| Marketing katalog linkovi → dashboard/pricing | ✅ |

---

## Posle M1 (ne danas, osim ako imaš vreme)

- Stripe live (M6) — čeka firmu
- HeyGen/D-ID — avatar paketi
- Lead DB F2+ — kad prihod pokrije API (~€200/mes)
- Outbound send — posle email warmup

Detaljno: [`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md)

---

*Ažuriraj ovaj fajl kad zatvoriš korak 4 (prva uplata).*

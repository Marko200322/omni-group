# Admin / vlasnik — tvoje stavke (M0–M1)

**Agent je završio kod.** Ispod je samo ono što **moraš ti** — ključevi, DNS, potvrda uplate, deploy env.

**Brzi put:** popuni `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` → `.\scripts\apply-integration-keys.ps1` → `.\scripts\deploy-from-local-secrets.ps1`

---

## P0 — novac odmah (M0 gate)

| # | Ti uradiš | Gde / kako |
|---|-----------|------------|
| 1 | **DNS** `api.omnigrouptech.com` → A zapis **`5.189.184.103`** | Registrar; proveri: `.\scripts\verify-production-dns.ps1` |
| 2 | **Prva potvrđena uplata na prod** | Admin → Pending payments → **Confirm**; sačuvaj referencu/fakturu |
| 3 | **IBAN / manual billing** na prod | `atina-platform/atina/.env.vps.prod`: `MANUAL_PAYMENT_IBAN`, `MANUAL_PAYMENT_ACCOUNT_NAME`, `ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true` |
| 4 | **Deploy posle agent izmena** | `.\scripts\deploy-from-local-secrets.ps1` (web + API) |

**Agent urađeno u kodu:** `#billing` na dashboardu, katalog → `/pricing`, kontakt pre-fill + CRM ingress, PayPal → `#billing`.

---

## M1 — inbound (leadovi)

| # | Ti uradiš | Env varijable |
|---|-----------|---------------|
| 5 | **Resend** — API ključ + verifikovan domen | Web prod: `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` |
| 6 | **Test kontakt forme** | `.\scripts\test-contact-resend.ps1` → mora stići email (ne `queued_local_stub`) |
| 7 | **CRM ingress** — owner/admin nalog za javne leadove | Web prod: `CONTACT_CRM_INGRESS_EMAIL`, `CONTACT_CRM_INGRESS_PASSWORD` (Pro plan na tom nalogu) |
| 8 | **Slack ping na kontakt** (opciono) | Web prod: `CONTACT_SLACK_WEBHOOK_URL` **ili** Atina: `SLACK_WEBHOOK_URL` (uplata/fulfillment) |
| 9 | **Telegram ops** (opciono) | Atina: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (KLJUCEVI §1) |

**Agent urađeno u kodu:** BFF `/api/atina/crm/*`, CRM panel na dashboardu, Slack hook na contact POST, `#sales` / `#automations` anchori.

---

## Kasnije (ne blokira M0–M1)

| # | Stavka | Kada |
|---|--------|------|
| 10 | **Stripe live** (firma registrovana) | M6 ili kad budeš spreman |
| 11 | **HeyGen / D-ID** avatar ključevi | Paralelno — `KLJUCEVI-POPUNI.local.txt` |
| 12 | **GitHub branch protection** + zelen CI | [`OWNER-ACTION-CHECKLIST.md`](./OWNER-ACTION-CHECKLIST.md) |
| 13 | **CEO evidencija** prve prod uplate | [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) |

---

## Brza verifikacija (posle tvog deploy-a)

```powershell
.\scripts\smoke-platform-full.ps1 -WebBase https://omnigrouptech.com -Password <admin>
.\scripts\test-contact-resend.ps1
```

**Očekivano:** smoke 32/32; kontakt email stiže; novi lead u CRM (dashboard → Projects → CRM contacts) ako su #7 env postavljeni.

---

## Povezano

- [`MARKETING-REVENUE-PHASED-CHECKLIST.md`](./MARKETING-REVENUE-PHASED-CHECKLIST.md) — faze M0–M6  
- [`SYSTEM-INTEGRATION-CHECKLIST.md`](./SYSTEM-INTEGRATION-CHECKLIST.md) — gap register  
- [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) — širi CEO / infra posao  

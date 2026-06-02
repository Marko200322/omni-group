# Kriptoman — integracija u Atina

Kriptoman je **kripto checkout** provajder u `payments` modulu (pored Stripe, PayPal, Wise i ručnog transfera).

## Env (`atina-platform/atina/.env`)

| Ključ | Opis |
|-------|------|
| `KRIPTOMAN_ENABLED` | `true` da prikaže metodu na dashboardu |
| `KRIPTOMAN_URL` | Base URL API-ja (npr. `https://api.kriptoman.example/v1`) |
| `KRIPTOMAN_API_KEY` | Bearer token |
| `KRIPTOMAN_WEBHOOK_SECRET` | HMAC za `X-Kriptoman-Signature` |
| `KRIPTOMAN_MERCHANT_ID` | Opciono |
| `KRIPTOMAN_DEFAULT_CRYPTO` | Podrazumevano `USDT` |
| `KRIPTOMAN_DEV_MOCK` | `true` = mock checkout bez pravog API-ja |

Alternativa: **FINANCE agregator** sa rutama `POST /v1/kriptoman/invoices` i `GET /v1/kriptoman/invoices/:id` (isti payload kao direktni API).

## API rute (Atina)

| Metoda | Putanja | Auth |
|--------|---------|------|
| `POST` | `/api/v1/payments/kriptoman/checkout` | korisnik |
| `POST` | `/api/v1/payments/kriptoman/webhook` | webhook (potpis) |
| `POST` | `/api/v1/payments/kriptoman/sync/:paymentId` | korisnik (poll) |
| `POST` | `/api/v1/payments/kriptoman/confirm/:paymentId` | admin (fallback) |

## Migracija

`npm run migrate` — uključuje `013_payments_kriptoman_provider.sql` (dozvoljava `provider = 'kriptoman'`).

## Webhook (Kriptoman → Atina)

- URL: `{APP_URL}/api/v1/payments/kriptoman/webhook`
- Header: `X-Kriptoman-Signature: <hmac-sha256 hex body>`
- Statusi koji aktiviraju pretplatu: `paid`, `completed`, `success`, `confirmed`

## Lokalni test bez provajdera

```env
KRIPTOMAN_ENABLED=true
KRIPTOMAN_DEV_MOCK=true
```

Dashboard → **Plati preko Kriptoman** → mock link; admin ili `sync` nakon mock statusa.

# Lead baze (Apollo, Hunter, …) — fazno paljenje

Integracija B2B lead baza i email verifikacije u Client Hunter → CRM → Outbound flow.

## Provajderi

| Tip | Provajder | Env ključ | Napomena |
|-----|-----------|-----------|----------|
| Lead DB | **Apollo.io** | `APOLLO_API_KEY` | People search |
| Lead DB | **Hunter.io** | `HUNTER_API_KEY` | Email po domenu |
| Lead DB | **Lusha** | `LUSHA_API_KEY` | Person by domain |
| Lead DB | **Snov.io** | `SNOV_USER_ID` + `SNOV_API_KEY` | Domain emails |
| Lead DB | **ZoomInfo** | `ZOOMINFO_API_KEY` | Enterprise placeholder |
| Verify | **NeverBounce** | `NEVERBOUNCE_API_KEY` | Pre outbound |
| Verify | **ZeroBounce** | `ZEROBOUNCE_API_KEY` | Fallback verify |

Lanac (prvi konfigurisani pobeđuje):

```
LEAD_DATABASE_PROVIDER_CHAIN=apollo,hunter,lusha,snov,zoominfo
EMAIL_VERIFICATION_PROVIDER_CHAIN=neverbounce,zerobounce
```

## Fazno paljenje (€200/mes budžet)

| Faza | Kada | Env | Šta radi |
|------|------|-----|----------|
| **F0** | Lokalno | `LEAD_DATABASE_ENABLED=false` `PHASE=F0` | Samo web scrape |
| **F1** | Go-live | `LEAD_DATABASE_ROLLOUT_PHASE=F1` | Scrape + outbound warmup |
| **F2** | Mesec 1 | `F2` + `NEVERBOUNCE_API_KEY` | Ručni verify API (CRM), **bez** auto-enrich |
| **F3** | Prvi prihod blizu | `F3` + `HUNTER_API_KEY` | **Enrich na hunt** (Hunter/Snov), bez auto-verify |
| **F4** | Stabilan MRR | `F4` + `APOLLO_API_KEY` | Pun lanac + **auto verify** na hunt |
| **F5** | Pun gas | `F5` | Verify **obavezan** pre slanja |

Uključivanje:

```env
LEAD_DATABASE_ENABLED=true
LEAD_DATABASE_ROLLOUT_PHASE=F3
HUNTER_API_KEY=...
```

Forsiraj enrich pre faze: `LEAD_ENRICH_ON_HUNT=true`

## Flow

```
Apify scrape (Upwork/Fiverr/LinkedIn)
        ↓
Lead DB chain (Apollo/Hunter/…)  ← F3+
        ↓
Email verify (NeverBounce/…)     ← F2+, obavezno F5
        ↓
CRM kontakt (email, company)
        ↓
Outbound queue (pravi lead_email)
        ↓
Resend/Courier
```

## API

| Endpoint | Opis |
|----------|------|
| `GET /api/v1/client-hunter/lead-databases/status` | Faza, provajderi, configured |
| `GET /api/v1/client-hunter/readiness` | Uključuje `lead_database` check |

## Migracija

```powershell
cd atina-platform\atina
# primeni 028_lead_database_providers.sql kroz migrate.ts ili apply skriptu
npm run migrate
```

## Prodavnica resursa

SKU: `apollo_25`, `hunter_10`, `neverbounce_10` — interni wallet (bookkeeping).

## Budžet napomena

- **F0–F2:** €200/mes — bez Apollo (preskoči)
- **F3:** Hunter ~$49/mes
- **F4+:** Apollo ~$49–99/mes + verify

Kod provajdera uplatiš kredit; sistem troši preko API ključeva u `.env`.

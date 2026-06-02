# Vlasnik — popuna `atina-platform/atina/.env`

**Ne commituj** `.env`. Kompletan šablon (sve ključeve): [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example) — **ti popunjavaš samo agregatore (URL + KEY)** i Stripe polja; ostalo je već podešeno za lokalni dev.  
Infrastruktura je u istom `.env` (DB, Redis, JWT) — ne moraš duplirati u `env-aggregator.json`.  
Ostali delovi monorepa: `apps/omnigroup-web/.env.local.example`, `atina-system/.env.example`, `tools/youtube-pipeline/.env.example` (YouTube pipeline automatski učitava Atina `.env`).

## Redosled (15–30 min)

### 1. Kopiraj šablon (samo prazna polja)

U `atina-platform/atina/.env` popuni **URL + KEY** za svaki agregator koji koristiš. Lokalni dev radi i **bez** njih.

**Mapa u `.env.example` (redni broj u editoru ≈):**

| Linija (≈) | Blok |
|------------|------|
| 12–13 | `AI_URL` / `AI_KEY` |
| 14–15 | `BUSINESS_AND_DEV_*` |
| 16–17 | `SCRAPER_*` |
| 18–28 | `FINANCE_*` + Stripe + PayPal/Wise |
| 30–35 | PayPal / Wise (opciono) |
| **37–39** | **`COMMS_URL` / `COMMS_KEY`** ← outreach, follow-up, deal-offer |
| 41–43 | `INFRASTRUCTURE_*` |
| 45–47 | `STORAGE_*` |

| # | Blok | Kada popuniti |
|---|------|----------------|
| 1 | `AI_URL` / `AI_KEY` | Craftor, lead-scoring, OmniTube AI, validator enrich |
| 2 | `BUSINESS_AND_DEV_*` | integration-hub / Nango sync |
| 3 | `SCRAPER_*` | client-hunter, proxy-rotation |
| 4 | `FINANCE_*` + Stripe polja | Plaćanja (Stripe live) |
| 5 | `COMMS_*` | outreach, follow-up, deal-offer notify |
| 6 | `INFRASTRUCTURE_*` | Ops / deploy agregator (opciono) |
| 7 | `STORAGE_*` | backup, upload (opciono) |
| 8–10 | `CAPTCHA_*`, `DOMAIN_*`, `WEB3_*` | Kad modul traži te servise |

### 2. Platform polja (već delimično)

| Ključ | Preporuka |
|-------|-----------|
| `PHASE` | `v1` lokalno; `v2+` kad testiraš gating |
| `YOUTUBE_PIPELINE_URL` | npr. `http://127.0.0.1:8090` ako podigneš `tools/youtube-pipeline` |
| `APEX_SUICIDE_SWITCH_ARMED` | drži `false` |

### 3. Provera (bez ispisa tajni)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\check-atina-aggregators.ps1
.\scripts\check-stripe-env.ps1
```

Cilj: bar **FINANCE** + **AI** + **COMMS** = OK pre staging smoke-a.

### 4. Migracija i smoke (lokalno)

```powershell
cd atina-platform\atina
npm run migrate
npm run smoke:all
```

Posle deploya na prod: ponovi `smoke:all` sa `-BaseUrl https://tvoj-domen`.

## Reference

- [`production-config-matrix.md`](../atina-platform/atina/docs/operations/production-config-matrix.md)
- [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) — CEO koraci A/C/G
- [`AGENT-HANDOFF-OSTALO.md`](./AGENT-HANDOFF-OSTALO.md)

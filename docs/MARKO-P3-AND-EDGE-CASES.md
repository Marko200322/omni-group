# Kompletan P3 + niche edge-case uvid (za Marka)

**Datum:** 2026-10-09  
**Kanonski izvor:** [`STATUS-KANON.md`](./STATUS-KANON.md) · prazni ključevi [`generated/EMPTY-KEYS.md`](./generated/EMPTY-KEYS.md)

Ovo **nije** rupa u isporuci paketa. P3 = opciono proširenje (više leadova, više kanala, više vendor AI).

---

## Katalog: 1000 paketa × 50 industrija (već u sistemu)

| Broj | Šta |
|-----:|-----|
| **20** | Bazne sposobnosti (setup, audit, landing, ecommerce, retainers, bundlovi…) |
| **50** | Industrije (`INDUSTRY_CATEGORIES` = 25 freelance + 25 SMB) |
| **~1000** | Sellable SKU = `base__industry` (npr. `landing__fitness`) — live `/api/public/catalog` |

**Fulfillment dokaz:** HARD matrix **20×50 = 1000 ćelija** (jedan prolaz po industriji × bazni paket), ne 1000×1000.  
**Više industrija = više para:** dodaj slug u `category-pricing.ts` (+ atina mirror) → automatski ~+20 SKU-ova po industriji. Nije “ručno 1000 sajtova”.

---

## P3-A · Enrich / outbound

| ID | Šta | Status | Šta ti radiš |
|----|-----|--------|--------------|
| P3-A01 | Lusha API | READY / EMPTY | paste key |
| P3-A02 | Tavily API | READY / EMPTY | paste key |
| P3-A03 | ZoomInfo API | READY / EMPTY | paste key |
| P3-A04 | Cold outbound send ON | BLOCKED | Instantly **plan upgrade** ako 402 |
| P3-A05 | Live n8n workflow import | READY | `N8N_*` + import skripta |
| P3-A06 | Ads budžet €200–300 | TI | tvoja marketing odluka |

## P3-B · Integracije (fail-closed dok prazno)

Clay · Salesforge · Intercom · Sierra · Make · n8n · Ramp · Vic.ai · Jasper · Predis · Devin · Replit Agent · CrewAI · LangChain  

**EMPTY danas:** vidi tabelu ispod (isti set kao EMPTY-KEYS minus P2 payment keys).

## P3-C · Video / avatar advanced

| ID | Šta | Status |
|----|-----|--------|
| P3-C01 | Zoom **OAuth** API | Join linkovi rade; OAuth ključevi EMPTY |
| P3-C02 | Live call avatar (Recall / HeyGen Live / Deepgram) | Stub ON; live chain čeka ključeve |

## P3-D · Infra / ops

| ID | Šta | Status |
|----|-----|--------|
| P3-D01 | Staging VPS | TI — drugi server |
| P3-D02 | Uptime monitoring | **DONE** |
| P3-D03 | Plausible analytics | READY — prazan `plausibleDomain` = nema script |
| P3-D04 | GitHub required checks auth | BLOCKED lokalno (`gh auth`) — rule postoji |
| P3-D05 | DMARC `p=quarantine` | TI — DNS posle monitora |
| P3-D06 | Nest TypeORM prod | **N/A** |

## P3-E · Product backlog

| ID | Šta | Status |
|----|-----|--------|
| P3-E01 | Problem Hunter dedup | **DONE** |
| P3-E02 | F4 AI/email/upload proširenja | DEFERRED |
| P3-E03 | Faza 6 K8s / vector / GPU | DEFERRED |
| P3-E04 | Nivo 3 vision/PDF review | DEFERRED |
| P3-E05 | YouTube/Celery pipeline | DEFERRED |
| P3-E06 | Catalog-quality / cene | **DONE** |

## P3-F / P3-G

| ID | Šta | Status |
|----|-----|--------|
| P3-F02 | Disk C: ≥5 GB za pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **`apps/omnigroup-web`** osim **`-SkipOmnigroupWeb`**; posle servisa **`npm run smoke:all`**) | DEFERRED lokalno |
| P3-G01 | UI redizajn | **CANCELLED** |

---

## EMPTY ključevi (niche / vendor edge-case) — 32

Grupisano da vidiš “šta je to”:

### Plaćanja (već P2 / opciono posle LIVE)
`PAYPAL_*` · `WISE_*` · `KRIPTOMAN_*` · `FINANCE_URL`

### Lead enrich
`LUSHA_API_KEY` · `ZOOMINFO_API_KEY` · (`TAVILY` u STATUS — proveri deploy.config)

### Outbound / automation vendors
`N8N_*` · `MAKE_*` · `CLAY_*` · `SALESFORGE_*` · `INTERCOM_*` · `SIERRA_*`

### Content / finance AI vendors
`JASPER_*` · `PREDIS_*` · `RAMP_*` · `VIC_AI_*`

### Agent platforms
`DEVIN_*` · `REPLIT_AGENT_*` · `CREWAI_*` · `LANGCHAIN_*`

### Zoom OAuth (napredni calendar/API)
`ZOOM_ACCOUNT_ID` · `ZOOM_CLIENT_ID` · `ZOOM_CLIENT_SECRET`

Dok su prazni: sistem **ne laže** da su CONNECTED — fail-closed.

---

## Safety locks (edge-case ponašanje)

| Lock | Znači |
|------|--------|
| Stripe **TEST** | Nema prave kartice dok P2-02 |
| `LEAD_LIVE_HARVEST_ON_KICKOFF` OFF | Analysis radi; live hunt ne troši Apollo/ads |
| Instantly 402 moguć | Cold mass send nije pouzdan bez plana |
| Ads / Stripe Connect | Uvek CONFIGURATION REQUIRED na paketima |
| Custom domain | Nije u package includes |

---

## Šta NIJE edge-case — radi u core-u

Paketi · intro −18%/50 · commercial companion · support AI solver · Ultimatrix · prod smoke · 50 industrija × 20 baza ≈ 1000 SKU.

## Tvoj redosled ako hoćeš “više para”

1. **P2** firma + Stripe LIVE (naplata)  
2. Više industrija u `category-pricing` (skalira katalog)  
3. P3-A Instantly plan + ads budžet (outbound)  
4. Ostali P3 ključevi po potrebi  

Mystery shopper E2E: `.\scripts\e2e-billing-prod.ps1` (dokaz u `docs/evidence/_tmp-mystery-shopper-e2e-*.txt`).

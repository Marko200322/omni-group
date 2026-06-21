# Vlasnik — spisak šta da prikupiš (ključevi i URL-ovi)

**Jedan fajl za popunu:** `atina-platform/atina/.env` (NE commituj u Git)  
**Provera posle:** `.\scripts\check-atina-aggregators.ps1` + `.\scripts\check-stripe-env.ps1`

Označavaj `[ ]` dok sakupljaš. **Prioritet:** 🔴 obavezno za staging · 🟡 preporučeno · ⚪ opciono.

---

## 🔴 Minimum za staging (počni ovde)

### 1. AI agregator
| Prikupljaš | Upis u `.env` | Primer provajdera |
|------------|---------------|-----------------|
| Base URL API-ja | `AI_URL` | OpenRouter, Together, tvoj AI gateway |
| API ključ | `AI_KEY` | `sk-or-...` ili gateway token |

**Koristi:** Craftor, ai-memory, lead-scoring, validator, OmniTube AI, Apex, Dominus360, titan-master.

---

### 2. Finance + Stripe (live checkout)
| Prikupljaš | Upis u `.env` | Gde naći |
|------------|---------------|----------|
| Finance agregator URL (ako imaš proxy) | `FINANCE_URL` | Tvoj finance servis — **može prazno** ako ide direktno Stripe |
| Stripe secret key | `FINANCE_KEY` | Stripe → Developers → API keys → **Secret** (`sk_test_` staging) |
| (Alias, opciono) | `STRIPE_SECRET_KEY` | Isto kao `FINANCE_KEY` |
| Webhook signing secret | `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → endpoint → `whsec_...` |
| Publishable key | `STRIPE_PUBLISHABLE_KEY` | API keys → **Publishable** (`pk_test_`) |
| Starter plan Price ID | `STARTER_PRICE_ID` | Products → plan → Price → `price_...` |
| Pro plan Price ID | `PRO_PRICE_ID` | isto |
| Enterprise plan Price ID | `ENTERPRISE_PRICE_ID` | isto |

**Bez firme (pre Stripe-a):** ostavi Stripe prazno i koristi **`PAYMENTS_MODE=manual`** + **`MANUAL_PAYMENT_*`** (lični račun). Korisnik generiše uputstvo na dashboardu; ti kao admin potvrđuješ uplatu (`POST /api/v1/payments/manual/confirm/:paymentId`). Kad otvoriš firmu → `PAYMENTS_MODE=sandbox` pa `live` + Stripe ključevi.

**Email automatski (ručna uplata):**
| Događaj | Ko dobija email |
|---------|-----------------|
| Klijent generiše uputstvo | Klijent — IBAN, iznos, referenca |
| Klijent klikne „Poslao sam uplatu“ | **Ti** (`PAYMENT_NOTIFY_EMAIL` ili `ADMIN_EMAIL`) |
| Admin potvrdi uplatu | Klijent — faktura + potvrda plana |

Za slanje: **`SMTP_USER` + `SMTP_PASSWORD`** (Gmail app password) ili **`COMMS_URL` + `COMMS_KEY`**. Bez toga sistem i dalje radi — email se samo loguje kao upozorenje.

**Napomena:** Webhook URL na stagingu: `https://tvoj-api/api/v1/payments/webhook/stripe` (proveri tačnu rutu u kodu pre deploya).

---

### 2b. Video support (Zoom / Google Meet) — **prvo support, prodaja kasnije**

Dashboard → **Podrška** (`/dashboard#support`): klijent zakazuje poziv; ti kao admin potvrđuješ link (`POST /api/v1/video-meetings/support/confirm/:id`).

| Prikupljaš | Upis u `.env` | Napomena |
|------------|---------------|----------|
| Support inbox | `SUPPORT_NOTIFY_EMAIL` | Fallback: `PAYMENT_NOTIFY_EMAIL` → `ADMIN_EMAIL` |
| Agent ime + avatar | `SUPPORT_AGENT_NAME`, `SUPPORT_AGENT_AVATAR_URL` | Slika lica za Live Portrait |
| Glas (TTS) | `SUPPORT_AGENT_VOICE_ID` + `ELEVENLABS_API_KEY` | ElevenLabs voice ID |
| AI razumevanje | `AI_URL` + `AI_KEY` | Bez toga radi fallback odgovori |
| **Avatar tim + govor + animacija** | **`AI_URL` + `AI_KEY`** + `AVATAR_USE_AI_AGGREGATOR=true` | Agregator generiše tim i renderuje speech/video — vidi `atina-platform/atina/docs/operations/ai-aggregator-avatars-api.md` |
| Animacija lica (lanac) | `AVATAR_VIDEO_PROVIDER_CHAIN` + `HEYGEN_API_KEY` / `DID_API_KEY` / `APEX_LIVE_PORTRAIT_*` | Redosled: HeyGen → D-ID → Live Portrait — vidi [`AVATAR-MEDIA-STACK.md`](../../../docs/AVATAR-MEDIA-STACK.md) |
| Glas (lanac) | `AVATAR_TTS_PROVIDER_CHAIN` + `ELEVENLABS_*` / `CARTESIA_*` | ElevenLabs → Cartesia |
| Memorija klijenta | `AVATAR_CLIENT_MEMORY_ENABLED=true` | Lokalno + AI agregator (Pinecone/Qdrant na gateway-u kasnije) |
| Javni URL portreta | `AVATAR_PUBLIC_BASE_URL`, `WEB_APP_URL` | Servira `/avatars/portraits/*.svg` sa web app-a |
| Setup skripta | `.\scripts\apply-avatar-premium-env.ps1` | + `config/avatar-premium.local.json` |
| Google Meet soba (instant) | `SUPPORT_GOOGLE_MEET_URL`, `SALES_GOOGLE_MEET_URL` | Dve sobe: support + sales |
| Zoom Server-to-Server | `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | Automatski kreira Zoom sobu |
| Trajanje poziva | `MEETING_DEFAULT_DURATION_MIN` | Default `30` |
| Prodaja (faza 2) | `SALES_MEETINGS_ENABLED=true` | Dok je `false`, prodajni endpointi vraćaju grešku |

**Email automatski:**
| Događaj | Ko dobija email |
|---------|-----------------|
| Klijent pošalje zahtev (ručno) | Klijent — potvrda prijema; **ti** — novi zahtev |
| Google Meet / Zoom instant | Klijent — link odmah |
| Admin potvrdi termin | Klijent — link + agent avatar |

Bez Zoom/Meet URL-a radi **ručno zakazivanje** (kao plaćanje bez firme).

**Prodajni avatar (Nikola):** `SALES_AVATAR_ENABLED=true` (default) — razgovor na dashboardu `#sales`. Booking live poziva: `SALES_MEETINGS_ENABLED=true`.

**Više avatara po timu (default u kodu + DB migracija 023):**
| Tim | Članovi |
|-----|---------|
| Support | Mila, Stefan, Jelena, Nemanja, Sara (5) — WFH pozadina |
| Prodaja | Nikola, Ana, Marko, Ivana, Luka, Teodora (6) — WFH pozadina |

Override celog tima: `SUPPORT_AGENTS_JSON` / `SALES_AGENTS_JSON` (JSON niz sa `id`, `name`, `title`, `avatarUrl`, `voiceId`, `persona`, `greeting`).

---

### 3. Comms agregator (email / SMS)
| Prikupljaš | Upis u `.env` | Primer provajdera |
|------------|---------------|-----------------|
| Comms URL | `COMMS_URL` | Courier, Twilio gateway, tvoj COMMS servis |
| Comms KEY | `COMMS_KEY` | Bearer token |

**Koristi:** outreach, follow-up, deal-offer, notifications (pre SMTP-a).

**Alternativa:** umesto COMMS popuni **SMTP** (sekcija 8) — `SMTP_USER` + `SMTP_PASSWORD` + `SMTP_ENABLED=true`.

---

## 🟡 Prošireno (većina ecosystem modula)

### 4. Scraper agregator
| Prikupljaš | Upis u `.env` | Primer |
|------------|---------------|--------|
| URL | `SCRAPER_URL` | Bright Data, Apify proxy, tvoj scraper API |
| KEY | `SCRAPER_KEY` | API token |

**Koristi:** client-hunter, proxy-rotation, scraper modul, Craftor (live hunt).

---

### 5. Storage agregator
| Prikupljaš | Upis u `.env` | Primer |
|------------|---------------|--------|
| URL | `STORAGE_URL` | S3-compatible, R2, Azure Blob gateway |
| KEY | `STORAGE_KEY` | Access key / token |

**Koristi:** backup-recovery, Forge deploy, Craftor artefakti.

---

### 6. Biznis / marketing / GitHub (Nango)
| Prikupljaš | Upis u `.env` | Primer |
|------------|---------------|--------|
| URL | `BUSINESS_AND_DEV_URL` | Nango ili sličan integration hub |
| KEY | `BUSINESS_AND_DEV_KEY` | API key |

**Koristi:** integration-hub, digital-signature.

---

## ⚪ Opciono (kad uključuješ te feature-e)

### 7. Infrastructure agregator
| Prikupljaš | Upis u `.env` |
|------------|---------------|
| URL | `INFRASTRUCTURE_URL` |
| KEY | `INFRASTRUCTURE_KEY` |

**Koristi:** phase-launch (deploy trigger). Bez ovoga phase switch radi, samo bez remote deploya.

---

### 8. Captcha · Domain · Web3 storage
| Blok | URL | KEY |
|------|-----|-----|
| Captcha | `CAPTCHA_URL` | `CAPTCHA_KEY` |
| Domain | `DOMAIN_URL` | `DOMAIN_KEY` |
| Web3 storage | `WEB3_STORAGE_URL` | `WEB3_STORAGE_KEY` |

**Napomena:** klijenti postoje u kodu; moduli ih **još ne koriste** svuda — prikupi samo ako planiraš te servise.

---

### 9. PayPal / Wise (pored Stripe)
| Prikupljaš | Upis u `.env` |
|------------|---------------|
| PayPal Client ID | `PAYPAL_CLIENT_ID` |
| PayPal Secret | `PAYPAL_CLIENT_SECRET` |
| Režim | `PAYPAL_MODE` → `sandbox` ili `live` |
| Wise API key | `WISE_API_KEY` |
| Wise Profile ID | `WISE_PROFILE_ID` |

---

### 10. SMTP (ako nemaš COMMS)
| Prikupljaš | Upis u `.env` |
|------------|---------------|
| Uključi slanje | `SMTP_ENABLED=true` |
| Korisnik | `SMTP_USER` |
| Lozinka / app password | `SMTP_PASSWORD` |
| Pošiljalac | `EMAIL_FROM` (već `noreply@atina.io` — promeni za prod) |

Host/port već imaju default (`smtp.gmail.com:587`).

---

### 11. OmniTube / YouTube pipeline
| Prikupljaš | Upis u `.env` | Napomena |
|------------|---------------|----------|
| Pipeline servis | `YOUTUBE_PIPELINE_URL` | Već `http://127.0.0.1:8090` lokalno — na stagingu URL hosta |
| ElevenLabs | `ELEVENLABS_API_KEY` | elevenlabs.io |
| YouTube OAuth Client ID | `YOUTUBE_CLIENT_ID` | Google Cloud Console |
| YouTube Client Secret | `YOUTUBE_CLIENT_SECRET` | isto |
| Refresh token | `YOUTUBE_REFRESH_TOKEN` | OAuth flow (jednom generišeš) |
| Privatnost uploada | `YOUTUBE_PRIVACY_STATUS` | `private` / `unlisted` / `public` |

**Plus:** Python servis `tools/youtube-pipeline` mora biti **pokrenut** na tom URL-u.

---

### 12. Apex Predator (media — van agregatora)
| Prikupljaš | Upis u `.env` |
|------------|---------------|
| Flux API URL | `APEX_FLUX_API_URL` |
| Flux API key | `APEX_FLUX_API_KEY` |
| Live Portrait URL | `APEX_LIVE_PORTRAIT_API_URL` |
| Live Portrait key | `APEX_LIVE_PORTRAIT_API_KEY` |

`APEX_SUICIDE_SWITCH_ARMED` drži **`false`**.

---

### 13. OmniGame (Steam)
| Prikupljaš | Upis u `.env` |
|------------|---------------|
| Steam Web API key | `STEAM_WEB_API_KEY` | steamcommunity.com/dev/apikey |

Pun Steamworks publish i dalje traži **Steam partner** nalog (van `.env`).

---

## Drugi fajlovi (van Atina `.env`)

### 14. Omni Group web — `apps/omnigroup-web/.env.local`
| Prikupljaš | Ključ | Napomena |
|------------|-------|----------|
| Atina API (već set) | `NEXT_PUBLIC_ATINA_API_BASE` | `http://127.0.0.1:3000` lokalno |
| Session cookie secret | `SESSION_SECRET` | Random 32+ znakova — **obavezno na prod** |
| Resend API key | `RESEND_API_KEY` | resend.com — kontakt forma |
| From email | `CONTACT_EMAIL_FROM` | npr. `onboarding@resend.dev` (sandbox) |
| Inbox | `CONTACT_EMAIL_TO` | tvoj email |

Test: `.\scripts\test-contact-resend.ps1`

---

### 15. Nest (`atina-system`) — samo ako posebno pokrećeš Nest
Fajl: `atina-system/.env` ili `config/env-aggregator.json` sekcija `nest`.

| Prikupljaš | Ključ |
|------------|-------|
| Postgres host/port/user/pass/db | `POSTGRES_*` |
| JWT secret (32+ znakova) | `JWT_SECRET` |
| Prod | `TYPEORM_SYNC=false` |

---

## Produkcija — promeni pre go-live (ne agregatori)

U **`atina-platform/atina/.env`** na prod serveru:

| Stavka | Zahtev |
|--------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | min 32 znaka, random, ≠ dev |
| `JWT_REFRESH_SECRET` | drugačiji od JWT_SECRET |
| `ADMIN_PASSWORD` | ≠ `Admin@123456` |
| `DB_PASSWORD` | jaka lozinka, `DB_SSL=true` |
| Stripe | `sk_live_`, `pk_live_`, live Price ID, live webhook |
| `APP_URL` | pravi domen (https) |

---

## Brza checklista — štikliraj

```
STAGING MINIMUM
[ ] AI_URL + AI_KEY
[ ] FINANCE_KEY (sk_test_...)
[ ] STRIPE_WEBHOOK_SECRET
[ ] STRIPE_PUBLISHABLE_KEY
[ ] STARTER / PRO / ENTERPRISE Price ID
[ ] COMMS_URL + COMMS_KEY  (ili SMTP_USER + SMTP_PASSWORD)

PROŠIRENO
[ ] SCRAPER_URL + SCRAPER_KEY
[ ] STORAGE_URL + STORAGE_KEY
[ ] BUSINESS_AND_DEV_URL + BUSINESS_AND_DEV_KEY

OPCIONO
[ ] FINANCE_URL (ako koristiš finance proxy)
[ ] PAYPAL_* / WISE_*
[ ] INFRASTRUCTURE_*
[ ] CAPTCHA_* / DOMAIN_* / WEB3_*
[ ] ELEVENLABS + YOUTUBE_* + pipeline servis
[ ] APEX_FLUX_* + APEX_LIVE_PORTRAIT_*
[ ] STEAM_WEB_API_KEY

WEB (apps/omnigroup-web/.env.local)
[ ] SESSION_SECRET (prod)
[ ] RESEND_* + CONTACT_EMAIL_*

POSLE POPUNE
[ ] .\scripts\check-atina-aggregators.ps1
[ ] .\scripts\check-stripe-env.ps1
[ ] Restart Atina → npm run smoke:all
[ ] .\scripts\smoke-web-integration.ps1
```

---

## Šta NE treba da prikupiš za lokalni dev

Već su u `.env` / `env-aggregator.json`: Postgres, Redis, JWT (dev), admin lozinka, rate limits, `PHASE=v1`, Forge putanja.

---

## Reference u repou

| Dokument | Svrha |
|----------|--------|
| [`VLASNIK-ENV-POPUNI.md`](./VLASNIK-ENV-POPUNI.md) | Korak-po-korak popuna |
| [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) | CEO koraci A/C/G |
| [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example) | Pun šablon svih ključeva |
| [`production-config-matrix.md`](../atina-platform/atina/docs/operations/production-config-matrix.md) | Prod matrica |

**Kriptoman** (kripto plaćanja) — vidi [`INTEGRACIJA-KRIPTOMAN.md`](./INTEGRACIJA-KRIPTOMAN.md):

| Prikupljaš | Env |
|------------|-----|
| API base URL | `KRIPTOMAN_URL` |
| API ključ | `KRIPTOMAN_API_KEY` |
| Webhook secret | `KRIPTOMAN_WEBHOOK_SECRET` |
| Merchant ID (ako traže) | `KRIPTOMAN_MERCHANT_ID` |

Uključi: `KRIPTOMAN_ENABLED=true`. Za lokalni dev bez API-ja: `KRIPTOMAN_DEV_MOCK=true`.

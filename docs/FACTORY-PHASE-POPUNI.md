# Factory phase — šta popuniti (M0 sada)

**Cilj:** kad popuniš ove fajlove i deploy-uješ, `factoryPhase: M0` u `deploy.config.json` automatski pali/gasi module preko `scripts/prod-factory-phase.ps1`.

**Redosled:** popuni fajlove ispod → `.\scripts\apply-integration-keys.ps1` → `.\scripts\deploy-from-local-secrets.ps1` → provere na dnu.

---

## Fajl 1 — glavni deploy config (OBAVEZNO)

**Put:** `deploy-secrets.local/deploy.config.json`  
**Template:** `deploy-secrets.local/deploy.config.template.json`

| Polje | M0 | M1 | M2+ | Status / napomena |
|-------|----|----|-----|-------------------|
| `factoryPhase` | `"M0"` | bump kad prođe gate | M2…M6 | ✅ M0 |
| `monthlyBudgetEur` | `200` | isto | raste sa prihodom | ✅ 200 |
| `vpsHost`, `sshPassword` | VPS | — | — | ✅ |
| `siteDomain`, `apiDomain` | domen + `api.` | — | — | ✅ domen; **DNS api još FAIL** |
| `adminEmail`, `adminPassword` | admin login | CRM fallback | — | ✅ |
| `manualPayment.*` | IBAN prod | — | — | ✅ |
| `resend.apiKey` | Resend | M1 inbound | — | ✅ ključ |
| `resend.contactFrom` | **`noreply@omnigrouptech.com`** | posle verify domena | — | ⚠️ u config OK; prod env još `onboarding@resend.dev` |
| `resend.contactTo` | tvoj inbox | — | — | ✅ |
| `openRouterApiKey` | AI fulfillment | — | — | ✅ |
| `elevenLabsApiKey` | avatar glas | — | — | ✅ |
| `slackWebhookUrl` | prazno OK | preporučeno | ops | ❌ prazno |
| `contactSlackWebhookUrl` | opciono | ping na /contact | — | ❌ nema u config (dodaj ili koristi `slackWebhookUrl`) |
| `heygenApiKey`, `didApiKey` | prazno | — | M3+ avatar | ❌ kasnije |
| `stripeSecretKey` + publishable + webhook | prazno | — | **M6** | ❌ namerno |
| `hunterApiKey` | — | — | **M4** lead enrich | ❌ dodaj kad pređeš M4 |

**Ti uradiš (van fajla):**
1. **DNS A:** `api.omnigrouptech.com` → `5.189.184.103` (trenutno NXDOMAIN)
2. **Resend dashboard:** verifikuj domen `omnigrouptech.com`, pa redeploy
3. **Prva uplata:** pricing → manual → Admin Confirm

---

## Fajl 2 — centralna lista ključeva (OBAVEZNO za sync)

**Put:** `atina-platform/atina/KLJUCEVI-POPUNI.local.txt`  
**Vodič:** `docs/KLJUCEVI-PRIRUPLJANJE.md`

Popuni redom (oznake `[ ]` u fajlu):

### §0 — već u deploy.config (proveri, ne dupliraj)
- VPS, Resend, OpenRouter, ElevenLabs, IBAN

### §1 — M0/M1 (Atina lokalno + sync)
| Ključ | Obavezno | Napomena |
|-------|----------|----------|
| `CURSOR_API_KEY` | dev agent | ✅ |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | ops ping | ✅ |
| `RESEND_API_KEY` | M1 | kopiraj iz deploy.config |
| `AI_KEY` / `OPENROUTER_API_KEY` | AI | kopiraj `openRouterApiKey` |
| `ELEVENLABS_API_KEY` | avatar | kopiraj iz deploy.config |

### §2 — Web dev (`apps/omnigroup-web/.env.local`)
| Ključ | Obavezno | Napomena |
|-------|----------|----------|
| `RESEND_API_KEY` | M1 test | ✅ set |
| `CONTACT_EMAIL_FROM` | M1 | ⚠️ promeni u `noreply@omnigrouptech.com` posle Resend verify |
| `CONTACT_EMAIL_TO` | M1 | ✅ |
| `SESSION_SECRET` | ≥32 chars | ⚠️ dev placeholder — OK lokalno |
| `CONTACT_CRM_INGRESS_EMAIL` | M1 CRM | ✅ email u KLJUCEVI |
| `CONTACT_CRM_INGRESS_PASSWORD` | M1 CRM | ❌ **popuni admin lozinku** |
| `CONTACT_SLACK_WEBHOOK_URL` | opciono | ❌ |

### §2b — Slack ops (Atina)
| Ključ | Kada |
|-------|------|
| `SLACK_WEBHOOK_URL` | uplata / fulfillment ping |

### §4–§9 — NE za M0 (ostavi prazno / false)
- Stripe (M6), HeyGen/D-ID (M3+), Scraper `SCRAPER_KEY` (M2), Hunter/Lead DB (M4), outbound warmup (M4+)

**Posle popune:**
```powershell
.\scripts\apply-integration-keys.ps1
```

---

## Fajl 3 — Web dev env

**Put:** `apps/omnigroup-web/.env.local`  
**Template:** `apps/omnigroup-web/.env.local.example`

| Varijabla | M0 | Status |
|-----------|-----|--------|
| `NEXT_PUBLIC_ATINA_API_BASE` | lokalno `http://127.0.0.1:3000` | ✅ |
| `SESSION_SECRET` | ≥32 | ⚠️ dev |
| `RESEND_API_KEY` | | ✅ |
| `CONTACT_EMAIL_FROM` | verified domen | ⚠️ `onboarding@resend.dev` |
| `CONTACT_EMAIL_TO` | | ✅ |
| `CONTACT_CRM_INGRESS_*` | M1 | ❌ nisu u .env.local (dodaj ili deploy ih vuče iz adminPassword) |

---

## Generisani prod env (NE edituj ručno — deploy ih piše)

Deploy (`deploy-from-local-secrets.ps1` + `prepare-vps-prod.ps1`) generiše:

| Fajl | Šta deploy upisuje |
|------|-------------------|
| `apps/omnigroup-web/.env.vps.production` | Resend, CRM, SESSION, `NEXT_PUBLIC_FACTORY_PHASE`, budget |
| `atina-platform/atina/.env.vps.prod` | manual payment, OpenRouter, factory phase module flags |

**Trenutni gap u `.env.vps.production` (redeploy posle popune):**
- `CONTACT_EMAIL_FROM` = `onboarding@resend.dev` → treba `noreply@omnigrouptech.com`
- nema `CONTACT_CRM_INGRESS_*` (deploy ih dodaje iz `adminEmail` + `adminPassword` ako nema posebnih polja)

---

## Factory phase — šta pali po fazi (automatski)

Skripta: `scripts/prod-factory-phase.ps1`  
Provera lokalno: `.\scripts\verify-factory-phase.ps1 -FactoryPhase M0`

| Faza | Bump kad | Ključevi koje TI dodaješ | Moduli |
|------|----------|--------------------------|--------|
| **M0** | sada | deploy.config + IBAN + DNS site | manual pay, fulfillment, product factory |
| **M1** | prvi inbound | Resend verify + CRM ingress | kontakt → CRM, notifikacije |
| **M2** | prihod ~€500+ | `SCRAPER_KEY` / Apify | scraper, automation, hunt F1 |
| **M3** | delivery scale | — | veći outreach cap, retry |
| **M4** | prihod ~€2k+ | `HUNTER_API_KEY`, lead DB, warmup | outbound send, lead enrich |
| **M5** | ops stabilan | — | autonomy tick, evolution (bez code edit) |
| **M6** | firma + Stripe | Stripe live, HeyGen/D-ID | kartice, market pricing |

Detaljni revenue gate: `docs/MARKETING-REVENUE-PHASED-CHECKLIST.md`

---

## Checklist — samo tvoj posao (M0→M1)

```
[ ] DNS api.omnigrouptech.com → 5.189.184.103
[ ] Resend: verify omnigrouptech.com + FROM = noreply@...
[ ] KLJUCEVI: RESEND, AI_KEY, ELEVENLABS (sync iz deploy.config)
[ ] KLJUCEVI: CONTACT_CRM_INGRESS_PASSWORD (= admin lozinka ili poseban CRM user)
[ ] (opciono) SLACK_WEBHOOK_URL + CONTACT_SLACK_WEBHOOK_URL
[ ] apply-integration-keys.ps1
[ ] deploy-from-local-secrets.ps1
[ ] verify-production-dns.ps1 → api OK
[ ] smoke-platform-full.ps1 → 32/32
[ ] test-contact-resend.ps1 → email stiže (ne stub)
[ ] Prva manual uplata → Admin Confirm → fulfillment PASS
[ ] Bump factoryPhase na M1 tek posle gore
```

---

## Brze komande

```powershell
# Otvori fajlove za popunu (iz root repoa)
code deploy-secrets.local\deploy.config.json
code atina-platform\atina\KLJUCEVI-POPUNI.local.txt
code apps\omnigroup-web\.env.local

# Sync + deploy + verify
.\scripts\apply-integration-keys.ps1
.\scripts\deploy-from-local-secrets.ps1
.\scripts\verify-production-dns.ps1
.\scripts\verify-factory-phase.ps1 -FactoryPhase M0
.\scripts\smoke-platform-full.ps1 -WebBase https://omnigrouptech.com -Password <admin>
.\scripts\test-contact-resend.ps1 -WebBase https://omnigrouptech.com
```

---

## Šta je već OK u kodu (ne popunjavaš)

- Factory phase runtime + admin panel (`FactoryPhasePanel`)
- Package pricing M0, checkout gates po fazi
- BFF rute, fulfillment 17 paketa, manual billing flow
- `verify-factory-phase.ps1` M0: **41/41 PASS** (lokalno)

---

*Poslednji audit: jul 2026 — factoryPhase M0, budget €200/mo, site DNS OK, api DNS FAIL, 0 prod uplata.*

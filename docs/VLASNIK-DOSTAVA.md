# Vlasnik — tvoja dostava (gde šta ide)

**Ovo je tvoj jedan obrazac.** Štikliraj `[x]` kad završiš.  
**Tajne NE u chat / NE u Git** — samo u fajlove ispod.

| Gde upisuješ | Put | Čemu služi |
|--------------|-----|------------|
| **A — Deploy** | `deploy-secrets.local/deploy.config.json` | Prod VPS (glavni) |
| **B — Ključevi** | `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` | Sync → `.env` + deploy |
| **C — Web lokal** | `apps/omnigroup-web/.env.local` | Lokalni Next (kontakt) |
| **D — Odluke** | ovaj fajl (sekcija 3–4) | Budget, faze, ToS… |

**Posle popune ključeva:**
```powershell
.\scripts\apply-integration-keys.ps1
.\scripts\deploy-from-local-secrets.ps1   # kad hoćeš na VPS
.\scripts\verify-production-dns.ps1       # posle DNS
```

---

## 1. DNS (kod registrara) — van fajlova

| Stavka | Vrednost | Status |
|--------|----------|--------|
| `api.omnigrouptech.com` → **A** | `5.189.184.103` | [ ] |
| Resend SPF / DKIM / DMARC | iz Resend → Domains → `omnigrouptech.com` (kopiraj tačno) | [ ] |
| Resend domen **Verified** | screenshot ili “done” u chat (bez ključeva) | [ ] |

Provera: `.\scripts\verify-production-dns.ps1`

---

## 2. Nalozi + ključevi → fajl A ili B

Upiši u **A** (`deploy.config.json`) *i/ili* **B** (`KLJUCEVI-…`).  
Deploy skripta čita **A**; `apply-integration-keys.ps1` čita **B**.

### 2.1 Email — Resend (P1, sada)

| Šta | Polje u **A** | Polje u **B** / web | Status |
|-----|---------------|---------------------|--------|
| API key | `resend.apiKey` | `RESEND_API_KEY` | [ ] |
| From | `resend.contactFrom` | `CONTACT_EMAIL_FROM` | [ ] |
| To (inbox) | `resend.contactTo` | `CONTACT_EMAIL_TO` | [ ] |
| Domen verified | (DNS gore) | — | [ ] |

Predlog: `noreply@omnigrouptech.com` / `support@omnigrouptech.com`.

### 2.2 Stripe (M6 — kad firmu imaš)

| Šta | Polje **A** | Polje **B** | Status |
|-----|-------------|-------------|--------|
| Secret | `stripeSecretKey` | `STRIPE_SECRET_KEY` / `FINANCE_KEY` | [ ] |
| Publishable | `stripePublishableKey` | `STRIPE_PUBLISHABLE_KEY` | [ ] |
| Webhook secret | `stripeWebhookSecret` | `STRIPE_WEBHOOK_SECRET` | [ ] |
| Price starter | `starterPriceId` | `STARTER_PRICE_ID` | [ ] |
| Price pro | `proPriceId` | `PRO_PRICE_ID` | [ ] |
| Price enterprise | `enterprisePriceId` | `ENTERPRISE_PRICE_ID` | [ ] |

Webhook URL (kad DNS radi): `https://api.omnigrouptech.com/api/v1/payments/webhook/stripe`  
*(ako ruta drugačija — agent potvrdi pre live)*

**Alternativa:** reci “napravi cene u Stripe UI po tvojim paketima” → ti pošalješ samo `price_…` ID-eve.

Do tada ostaje **manual IBAN** (`manualPayment.*` u **A**).

### 2.3 Ostala plaćanja (opciono)

| Šta | Gde (**B**) | Status |
|-----|-------------|--------|
| PayPal client + secret | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | [ ] / preskoči |
| Kriptoman URL + key | `KRIPTOMAN_*` (+ `KRIPTOMAN_ENABLED` u Atina `.env`) | [ ] / preskoči |
| Wise key + profile | `WISE_API_KEY`, `WISE_PROFILE_ID` | [ ] / preskoči |

### 2.4 Lead / kvalitet

| Šta | Polje **A** | Polje **B** | Kada | Status |
|-----|-------------|-------------|------|--------|
| Hunter | `hunterApiKey` | `HUNTER_API_KEY` | M4 | [ ] |
| Snov | — | `SNOV_USER_ID`, `SNOV_API_KEY` | opciono | [ ] / preskoči |
| NeverBounce | `neverbounceApiKey` | `NEVERBOUNCE_API_KEY` | opciono | [ ] / preskoči |

### 2.5 Avatar video

| Šta | Polje **A** | Polje **B** | Status |
|-----|-------------|-------------|--------|
| HeyGen | `heygenApiKey` | `HEYGEN_API_KEY` | [ ] / kasnije |
| D-ID | `didApiKey` | `DID_API_KEY` | [ ] / kasnije |

### 2.6 OmniTube (samo ako ide)

| Šta | Gde | Status |
|-----|-----|--------|
| YouTube OAuth client/secret/refresh | Atina `.env` / `tools/youtube-pipeline/.env` → `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | [ ] / preskoči |

### 2.7 Ops (opciono)

| Šta | Polje **A** | Polje **B** | Status |
|-----|-------------|-------------|--------|
| Slack webhook | `slackWebhookUrl` (+ `contactSlackWebhookUrl`) | `SLACK_WEBHOOK_URL` / `CONTACT_SLACK_WEBHOOK_URL` | [ ] / preskoči |
| SMTP (samo ako NE Resend) | `smtp.*` | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | [ ] / preskoči |

---

## 3. Biznis tekstovi / podaci → ovde (ili pošalji agentu kao tekst)

Ne idu u Stripe ključeve — idu u fakture / legal stranice / support.

| Stavka | Upiši ovde | Status |
|--------|------------|--------|
| Firma (naziv) | _…_ | [ ] |
| PIB | _…_ | [ ] |
| Adresa | _…_ | [ ] |
| Javni support email | npr. `support@omnigrouptech.com` → _…_ | [ ] |
| ToS tekst | fajl: `apps/omnigroup-web/…` ili paste u chat / ovde | [ ] |
| Privacy tekst | isto | [ ] |

Kad budeš imao tekst: reci “ToS/Privacy gotovi” i gde su (fajl ili paste).

---

## 4. Novac / odluke (ne ključ — “kada”)

Upiši odgovor u kolonu **Tvoja odluka**. Sync u **A**: `monthlyBudgetEur`, `factoryPhase`.

| Pitanje | Tvoja odluka | Status |
|---------|--------------|--------|
| Mesečni budget factory (AI/scraper/outreach) € | trenutno u config: **200** → novo: _…_ | [ ] |
| Redosled faza | `M0→M1→…→M6` ručno **ili** “sve automatski kad budget dozvoli” → _…_ | [ ] |
| Staging VPS? | da / ne (+ IP ako da) → _…_ | [ ] |
| Backup kod providera? | da / ne (+ gde) → _…_ | [ ] |
| Uptime monitoring (Better Stack itd.) | nalog **ili** “preskoči” → _…_ | [ ] |
| GitHub: branch protection na `main` | da smeš / ne → _…_ | [ ] |

---

## 5. Šta već imaš (stanje iz config-a — bez tajni)

| Stavka | Stanje |
|--------|--------|
| VPS / domen | `5.189.184.103` · `omnigrouptech.com` · `api.omnigrouptech.com` |
| `factoryPhase` | `M0` |
| `monthlyBudgetEur` | `200` |
| Resend from/to | set u deploy.config |
| Stripe / Hunter / HeyGen | još prazno (očekivano za M0) |
| DNS `api.` | **moraš ti** kod registrara |

---

## 6. Redosled sakupljanja (preporuka)

1. **DNS** `api` + Resend verify  
2. Potvrda Resend “done”  
3. Support email + firma/PIB/adresa (kad imaš)  
4. Budget € + faze (M1… ili auto)  
5. Staging / backup / monitoring / GitHub protection  
6. Stripe Price IDs (kad firmu)  
7. Hunter → HeyGen/D-ID → ostalo po fazi  

Kad završiš deo, u Cursor napiši npr.:

> Dostava: DNS api done. Resend verified. Budget = ___ €. Faze = ___. Staging = ne. Ostalo još skupljam.

Agent onda veže / deploy-uje — **bez** da lepiš secret vrednosti u chat.

---

## 7. Admin akcije van ključeva (provera 2026-07-17)

Ovo **nije** u listi “nalepi secret” — ali **blokira** M0→M1 / “upaljen sistem” jednako kao DNS.

### 7.1 Blokatori sada (uradi pre svega ostalog)

| # | Akcija | Status sada | Gde |
|---|--------|-------------|-----|
| 1 | DNS `api.omnigrouptech.com` → A `5.189.184.103` | **FAIL (NXDOMAIN)** | Registrar |
| 2 | Resend domen `omnigrouptech.com` = **Verified** | nepotvrđeno | Resend dashboard |
| 3 | Sync CRM ingress u **deploy** | **rupa:** ima u KLJUCEVI, **prazno** u `deploy.config.json` | pokreni `.\scripts\apply-integration-keys.ps1` pa redeploy |
| 4 | Test kontakt forme na prod | čeka Resend verify + deploy | `.\scripts\test-contact-resend.ps1` |
| 5 | **Prva Confirm uplata** (M0 gate) | neurađeno | Admin → Pending payments → Confirm |
| 6 | Prod web/API dostupnost | **timeout** sa ove mašine (2026-07-17) | VPS panel / `ssh` / Contabo — proveri da li kontejneri žive |

### 7.2 Prod hardening (ti na serveru / u deploy config)

| # | Stavka | Status sada | Napomena |
|---|--------|-------------|----------|
| 7 | `adminEmail` | još `admin@atina.io` | promeni u tvoj nalog (npr. `admin@omnigrouptech.com`) u **A** |
| 8 | `ADMIN_PASSWORD` / JWT secrets na VPS | neprovereno ovde | ≥32, ≠ default; `.env.vps.prod` |
| 9 | Web prod `SESSION_SECRET` | lokalno OK; prod? | mora biti jak na VPS |
| 10 | `NEXT_PUBLIC_ATINA_API_BASE` | do DNS: health preko sajta; posle DNS → `https://api.omnigrouptech.com` | |
| 11 | `OUTREACH_DEV_SEND_TO_FALLBACK=false` | prod | |
| 12 | `AUTONOMY_EVOLUTION_CODE_EDIT=false` | prod | |
| 13 | Nikad `RATE_LIMIT_DISABLED=true` | prod | |
| 14 | SSH ključ umesto lozinke | `sshPassword` set, `sshKeyPath` prazan | preporuka |

### 7.3 Ops / CEO (admin, ne developer “kod”)

| # | Stavka | Status | Dok |
|---|--------|--------|-----|
| 15 | GitHub branch protection na `main` | **čeka tebe** | [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) → [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) |
| 16 | CEO G evidencija (prod smoke + rollback) | **čeka sign-off** | [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) |
| 17 | Nest TypeORM prod (`TYPEORM_SYNC=false`) | samo ako Nest u prod | [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) |
| 18 | Staging VPS | odluka u §4 | |
| 19 | Backup politika | odluka u §4 | |
| 20 | Uptime monitoring | odluka u §4 | |
| 21 | Firma / PIB / adresa na fakturi | `manualPayment.accountName` = lično ime (OK do firme) | §3 |
| 22 | ToS + Privacy stranice | fali tekst | §3 |
| 23 | Support email javni | odluka | §3 |

### 7.4 Nije blokator M0 (kasnije OK)

Stripe · Hunter · HeyGen/D-ID · Snov/NeverBounce · PayPal/Wise/Kriptoman · OmniTube OAuth · Slack · SMTP (ako Resend radi) · scraper

### 7.5 Već OK (ne diraj ponovo)

| Stavka | Stanje |
|--------|--------|
| Web DNS `omnigrouptech.com` | → `5.189.184.103` |
| Resend/OpenRouter/ElevenLabs/Telegram/IBAN u deploy | set |
| AI + Resend u KLJUCEVI | set |
| Disk C: | ~22 GB free (OK) |
| GitHub remote | `Marko200322/omni-group` |
| `factoryPhase` / budget | M0 / €200 |

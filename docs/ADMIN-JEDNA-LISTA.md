# Admin — jedna lista (pripremi jednom → posle samo gledaj)

**Cilj:** sve povezati **unapred**. Faze M1–M6 se **AUTO** otključavaju (prihod + ključevi) — bez lovljenja panela po fazi.  
**Model:** TI jednom popuniš što fali → JA uvežem → ti Confirm / gledaš.  

**Legenda:** `[x]` gotovo · `[ ]` otvoreno · **TI** · **JA**  

**Stanje:** full · `factoryPhase: M4` (hard, `factoryPhaseAuto: false`) · budget €550 · https://omnigrouptech.com  

**AUTO gate-ovi:** M1 = Resend + 1 Confirm · M2 = scraper + MRR/revenue · M3 = fulfilled/MRR · M4 = Hunter + MRR · M5 = MRR €1500 · M6 = Stripe + MRR €2000. Bez ključa — staje.  
**Napomena:** AUTO je isključen — vlasnik finansira M4 direktno, pa moduli rade bez čekanja na MRR. Za M5/M6 vrati `factoryPhaseAuto: true` ili digni `factoryPhase`.  

**Legal:** `/legal/terms` · `/legal/privacy` (template). Firma na fakturi: `companyLegalName` / `companyTaxId` / `companyAddress`.

**Gde lepiš sve odjednom:** `deploy-secrets.local/deploy.config.json` (+ DNS/Resend u panelima). Template: `deploy-secrets.local/deploy.config.template.json`.

---

## BLOK 0 — već urađeno (ne diraj osim ako nešto pukne)

- [x] VPS Docker: web, atina-api, postgres, redis, caddy
- [x] Site DNS `omnigrouptech.com` + `www`
- [x] Health OK, admin login OK
- [x] Manual IBAN + checkout (setup-quick testiran)
- [x] Katalog: 50 industrija × 17 paketa (6 Ready / 11 under construction)
- [x] Fulfillment handleri 17/17 u kodu
- [x] `FACTORY_PHASE=M0` + `NEXT_PUBLIC_FACTORY_PHASE=M0`
- [x] `AI_KEY` / `AI_URL` + `OPENROUTER_API_KEY` alias
- [x] `RESEND_API_KEY` sync na web **i** Atina API
- [x] `CONTACT_EMAIL_TO` set
- [x] Telegram bot na web/API
- [x] Cursor API key set
- [x] ElevenLabs key set
- [x] Web healthcheck + font swap (TTFB warm ~150–300ms)

---

## BLOK 1 — PRIPREMA JEDNOM (sve što TI moraš spolja)

Radi **sve ispod što možeš odjednom**. Ne čekaj fazu. Kad je popunjeno, JA uvežem sve u sistem — faze posle samo pale module.

### 1A — DNS / paneli (bez ovoga mail/api neće biti “gotovi”)
- [ ] **TI** DNS: `api.omnigrouptech.com` → A `5.189.184.103`
- [ ] **TI** Resend: verifikuj `omnigrouptech.com` (SPF/DKIM/DMARC) dok ne bude **Verified**
- [ ] **TI** (opciono) Slack webhook URL
- [ ] **TI** Meet/Zoom linkovi (support + sales)
- [ ] **TI** VPS backup uključen + jednom restore test
- [ ] **TI** GitHub branch protection na `main` (ili daj JA `gh` auth)

### 1B — Upisi u `deploy.config.json` (jedan fajl = svi ključevi za M1–M6)

Već postoji / OK (ne diraj ako radi):
- [x] VPS, admin, IBAN, OpenRouter, Resend key, ElevenLabs, Telegram, budget €550, factoryPhase M4
- [x] Scraper URL/key (aktivan — `ENABLE_SCRAPER=true` na M4)

Popuni **sada** (prazno = ta faza se neće moći samo “gledati” dok ne dodaš):
- [ ] `resend.contactFrom` = `noreply@omnigrouptech.com` (posle verify)
- [ ] `paymentNotifyEmail`
- [x] `contactCrmIngressEmail` + `contactCrmIngressPassword` (= admin nalog; JA uvezao u deploy.config + local)
- [ ] `slackWebhookUrl` / `contactSlackWebhookUrl` (opciono)
- [ ] `supportGoogleMeetUrl` / `salesGoogleMeetUrl` (ili Zoom) — dodaćemo polja ako fale
- [x] `hunterApiKey` — **SET** u `deploy.config` / KLJUCEVI (M4 lead enrich); opciono neverbounce/zerobounce još prazno
- [ ] Outreach warmup: `OUTREACH_DOMAIN_WARMUP_COMPLETE=true` (trenutno false / warmup mode on — outbound send ograničen)
- [ ] `heygenApiKey` i/ili `didApiKey`
- [ ] `stripeSecretKey` + `stripePublishableKey` + `stripeWebhookSecret`
- [ ] `starterPriceId` / `proPriceId` / `enterprisePriceId`
- [ ] PayPal / Kriptoman / Wise — samo ako želiš te kanale
- [ ] YouTube OAuth — samo OmniTube
- [x] `monthlyBudgetEur` = **550** (AI cap ~$2.5/dan; katalog van €250 launch limita)
- [ ] Firma / PIB / adresa (za fakture) — `companyLegalName` / `companyTaxId` / `companyAddress`
- [x] ToS + Privacy stranice na sajtu (`/legal/terms`, `/legal/privacy`) — zameni counsel tekstom kad budeš imao
- [x] `factoryPhaseAuto: false` + `factoryPhase: M4` (vlasnik finansira; hard plafon M4)
### 1C — Jedan smoke posle uveza (jednom)
- [ ] **TI+JA** E2E: Ready paket → IBAN → Admin Confirm → artifact
- [ ] **TI+JA** Contact forma → mail + CRM lead

---

## BLOK 2 — JA POSLE TVOG POPUNJAVANJA (ti ne diraš)

Kad kažeš „popunio sam deploy.config“:
- [ ] **JA** sync svih ključeva u `.env.vps.prod` / web env
- [ ] **JA** `CONTACT_EMAIL_FROM` na tvoj domen
- [ ] **JA** CRM ingress + Meet/Slack uvezi
- [ ] **JA** ToS/Privacy/faktura na sajt
- [ ] **JA** full deploy
- [ ] **JA** provera: svi required keys za M1–M6 **SET** (prazni = javim šta još fali)
- [ ] **JA** checklist `[x]` u ovom fajlu

Posle ovoga: **više ne pripremaš ključeve po fazi.**

---

## BLOK 3 — AUTO otključavanje (gledate)

Trenutno **isključeno** (`factoryPhaseAuto: false`, hard `M4`). Kad vratiš `factoryPhaseAuto: true` u `deploy.config.json` (default u template-u):

- Runtime **effective phase** raste M0→M6 po prihodu + ključevima (bez redeploy-a za svaki bump).
- Admin panel prikazuje effective / blocked next / metrike.
- Telegram notifikacija kad faza skoči.

Ručni bump i dalje radi:

```text
.\scripts\bump-factory-phase.ps1 -TargetPhase M2 -Apply
deploy …
```

| Faza | Šta se samo upali | Preduslov | Status |
|------|-------------------|-----------|--------|
| M0 | 6 paketa, manual | — | [x] |
| M1 | email inbound, Full onboarding | Resend + 1 Confirm | [x] hard M4 |
| M2 | scraper / white-label / … | SCRAPER_KEY + revenue | [x] hard M4 |
| M3 | custom / ecommerce / AI support | revenue / fulfilled | [x] hard M4 |
| M4 | lead gen, Hunter | HUNTER_API_KEY + MRR | [~] moduli ON, **Hunter SET**; warmup outbound još nije complete |
| M5 | autonomy | MRR + budget | [ ] AUTO |
| M6 | Stripe live + avatar | Stripe IDs + MRR | [ ] AUTO |

11 under-construction paketa → faza ih otvori na `/pricing` kad effective dozvoli.

---

## BLOK 4 — Opciono (ne blokira “samo gledaj”)

- [ ] Staging VPS
- [ ] Uptime monitoring
- [ ] Nest + Python + Astra u prod
- [ ] CDN za cold-start
- [ ] 2FA admin

---

## Kako radimo od sada

1. **TI** jednom: DNS + Resend verify + CRM ingress (+ ključeve M2–M6 unapred ako imaš).  
2. **JA** jednom: uveži + deploy (`factoryPhaseAuto: true`).  
3. **Posle:** Confirm uplate + gledaj — AUTO diže M1…M6 dokle god gate i ključevi dozvole.

**Sledeći korak:** ti kreneš Blok 1A+1B (sve što imaš). Kad završiš ili nalepiš deo, napiši „popunio X“ — ja radim Blok 2.

# Admin — jedna lista (pripremi jednom → posle samo gledaj)

**Cilj:** sve povezati **unapred**. Faze M1–M6 se **AUTO** otključavaju (prihod + ključevi) — bez lovljenja panela po fazi.  
**Model:** TI jednom popuniš što fali → JA uvežem → ti Confirm / gledaš.  

**Legenda:** `[x]` gotovo · `[ ]` otvoreno · **TI** · **JA**  

**Stanje (2026-08-06):** full · `factoryPhase: M4` · **`factory.ready: true`** · `factoryPhaseAuto: false` · budget €550 · https://omnigrouptech.com · fulfillment **850/850** · M4 launch gate **GO** · `/industries` → `/solutions` · daily hunt cron **ON** (drafts only) · burn tracker `.\scripts\m4-budget-burn-tracker.ps1`

**AUTO gate-ovi:** M1 = Resend + 1 Confirm · M2 = scraper + MRR/revenue · M3 = fulfilled/MRR · M4 = Hunter + MRR · M5 = MRR €1500 · M6 = Stripe + MRR €2000. Bez ključa — staje.  
**Napomena:** AUTO je isključen — vlasnik finansira M4 direktno. Za M5/M6 vrati `factoryPhaseAuto: true` ili digni `factoryPhase`.  

**Legal:** `/legal/terms` · `/legal/privacy` (template). Firma na fakturi: `companyLegalName` / `companyTaxId` / `companyAddress`.

**Gde lepiš sve odjednom:** `deploy-secrets.local/deploy.config.json` (+ DNS/Resend u panelima). Template: `deploy-secrets.local/deploy.config.template.json`.

---

## REDOM — ostalo zatvoriti (redosled)

Radi **jednu po jednu**. Kad stavka padne, pređi na sledeću.  
**Gap-scan 2026-08-04:** 10 agenata → `docs/evidence/gap-scan-2026-08-04/` (+ ovaj REDOM).

### Tier A — trust / IBAN kvalitet (pre “čistih” faktura)

1. [x] **TI+JA** GitHub branch protection na `main` (2026-08-05) — Require PR before merging (bez obaveznog approval-a) · rule id `81345794` · [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md)
2. [x] **JA** VPS backup + restore test (2026-08-04) — cron 03:15, dump `atina_saas_db`, restore drill 56 tabela — [`VPS-BACKUP-EVIDENCE-LATEST.md`](./VPS-BACKUP-EVIDENCE-LATEST.md)
3. [ ] **TI** Firma / PIB / adresa u `deploy.config` — `companyLegalName` / `companyTaxId` / `companyAddress` (EMPTY) · opciono `manualPayment.swift`
3b. [ ] **TI+JA** Invoice PDF email — Atina SMTP ili COMMS sa attachment (Resend = kontakt, ne PDF fakture) · smoke: proforma → Confirm → paid PDF
3c. [ ] **TI** Legal copy — Terms/Privacy su template; cookie/refund/impressum fali na sajtu (counsel)

### Tier B — CEO / kartice

4. [ ] **TI+JA** Stripe live + price IDs (kad kartice) — `stripe*` + `starter/pro/enterprisePriceId` EMPTY → M6 + webhook `…/payments/stripe/webhook`
5. [x] **JA** CEO **C** — Nest TypeORM prod = **N/A** (Nest nije u live Docker; ne dirati `atina_saas_db`) — [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md)
6. [~] **JA+TI** CEO **G** — **partial** 2026-08-04: `smoke:all` + admin monitoring + prod `.env` **PASS**; Stripe FAIL; staging/SMTP invoice/rollback owner open — [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md)

### Tier C — GTM / outbound mašina (M4 kod postoji, nije “daily unattended”)

6b. [x] **JA** Daily cron: hunt `pipeline/run` (2026-08-05) — `0 8 * * *`, outbound send **OFF** by default (`M4_OUTBOUND_SEND=0`) — [`M4-DAILY-HUNT-CRON-EVIDENCE-LATEST.md`](./evidence/M4-DAILY-HUNT-CRON-EVIDENCE-LATEST.md)
6c. [ ] **TI** Real Resend domain warmup (samo pre masovnog outbound senda) — kontakt forma već radi; cron trenutno **ne šalje** mail. Uključi send tek kad domain nije “hladan” za cold email.
6d. [ ] **TI** NeverBounce/ZeroBounce pre scale outbound · **TI** Plausible/GA4 za KPI
6e. [ ] **JA** Seed ≥50 CRM kontakata + 1 outbound→checkout (checklist gate)

### Tier D — opciono

7. [ ] **TI** Slack webhooks — EMPTY
8. [ ] **TI** HeyGen / D-ID, Apollo / Lusha / Snov, External AI stack — [`KLJUCEVI-PRIRUPLJANJE.md`](./KLJUCEVI-PRIRUPLJANJE.md)
9. [ ] **TI+JA** Staging VPS · offsite backup · uptime · CDN · 2FA · Nest+Python+Astra · secrets encrypted offsite · SSH key umesto lozinke
9b. [ ] **JA** (sync) `BRIGHTDATA_API_KEY` nije u VPS pipeline — dodati u `prepare-vps-prod` / deploy.config ako treba
9c. [ ] **JA** UX: deliverable “Stripe” dropdown je kozmetika (uvek manual) · buyer VAT u checkout · invoice history u portalu

**IBAN klijenti:** mogu sada (850/850). Čiste fakture ≈ Tier A #3+#3b. Kartice / CEO zeleno ≈ #1+#4+#6. Outbound mašina ≈ Tier C.

---

## BLOK 0 — već urađeno (ne diraj osim ako nešto pukne)

- [x] VPS Docker: web, atina-api, postgres, redis, caddy
- [x] Site DNS `omnigrouptech.com` + `www`
- [x] DNS `api.omnigrouptech.com` → A `5.189.184.103` (provera 2026-08-04)
- [x] Health OK, admin login OK
- [x] Manual IBAN + checkout + Confirm
- [x] Katalog: 50 industrija × 17 paketa
- [x] Fulfillment handleri 17/17 + live matrica **850/850 PASS**
- [x] `factoryPhase: M4` + `factoryPhaseAuto: false` + budget €550
- [x] OpenRouter / AI keys
- [x] Resend key (nested `resend.apiKey`) + kontakt smoke `sent_via_resend` + CRM ok + Telegram ok (2026-08-04)
- [x] `resend.contactFrom` = `noreply@omnigrouptech.com`
- [x] `paymentNotifyEmail` SET
- [x] `CONTACT_EMAIL_TO` set
- [x] Meet/Zoom support + sales URL SET u deploy.config
- [x] Telegram bot na web/API
- [x] Cursor API key set
- [x] ElevenLabs key set
- [x] Scraper + outreach M4 flags ON
- [x] Hunter API key SET
- [x] ToS + Privacy na sajtu
- [x] Contact forma → Resend + CRM (smoke 2026-08-04)

---

## BLOK 1 — PRIPREMA (TI spolja / deploy.config)

### 1A — Paneli / ops
- [x] DNS `api.` (vidi Blok 0)
- [x] Resend radi na kontaktu (vidi Blok 0); **TI** može još jednom potvrditi “Verified” u Resend UI (SPF/DKIM)
- [ ] **TI** (opciono) Slack webhook URL → REDOM #7
- [x] Meet/Zoom linkovi
- [x] **TI+JA** VPS backup + restore → REDOM #2 DONE ([`VPS-BACKUP-EVIDENCE-LATEST.md`](./VPS-BACKUP-EVIDENCE-LATEST.md))
- [x] **TI** GitHub branch protection / `gh auth` → REDOM #1 **DONE** (2026-08-05, browser)

### 1B — Još upisati u `deploy.config.json`
- [x] VPS, admin, IBAN, OpenRouter, Resend, ElevenLabs, Telegram, budget, M4, scraper, Hunter, outreach flags, CRM ingress, Meet/Zoom, paymentNotify, contactFrom
- [ ] Firma / PIB / adresa → REDOM #3
- [ ] Stripe + price IDs → REDOM #4
- [ ] (Opciono) Slack, HeyGen/D-ID, NeverBounce/ZeroBounce/Apollo, PayPal/Wise/Kriptoman, YouTube OAuth
- [ ] (Opciono) **External AI stack** — Clay/Salesforge, Intercom/Sierra, Make/n8n (M4); Ramp/Vic, Jasper/Predis, Devin/Replit, CrewAI/LangChain (M5). Samo ključevi u `deploy.config` / KLJUCEVI §11; status: `factory-phase/status → externalAiStack`

### 1C — Smoke
- [x] E2E fulfillment 850/850
- [x] Contact → mail + CRM

---

## BLOK 2 — JA (uvez / deploy)

- [x] Ključevi M4 uvezeni + deploy (ranije)
- [x] `CONTACT_EMAIL_FROM` / Resend from na domen
- [x] CRM ingress uvezen
- [x] Meet URL-ovi u configu
- [ ] Slack uveži kad TI da URL (REDOM #7)
- [x] ToS/Privacy na sajtu
- [ ] Firma na fakturi kad TI popuni (REDOM #3)
- [ ] Stripe uveži kad TI da live keys (REDOM #4)
- [x] CEO C = N/A (Nest out of prod) — REDOM #5
- [~] CEO G partial (smoke/admin PASS) — REDOM #6

---

## BLOK 3 — AUTO otključavanje (gledate)

Trenutno **isključeno** (`factoryPhaseAuto: false`, hard `M4`).

| Faza | Status |
|------|--------|
| M0–M4 | [x] hard M4 / moduli ON |
| M5 | [ ] AUTO (MRR) |
| M6 | [ ] AUTO (Stripe + MRR) |

---

## BLOK 4 — Opciono backlog

Vidi REDOM #9.

---

## Kako dalje

1. **Sada:** REDOM #1 (`gh auth login`) + #3 firma/PIB/adresa.  
2. Posle: #3b invoice SMTP → #4 Stripe (kad kartice) → ostatak CEO G (rollback owner).  
3. Outbound send: #6c warmup dokaz → uključi `M4_OUTBOUND_SEND=1` (cron već radi hunt).  
4. Opciono: Slack / avatar / enrich / staging (Tier C–D).

**Budžet burn:** `.\scripts\m4-budget-burn-tracker.ps1` → `-AddTopup 550` pa `-AddSpend -Provider Resend|OpenRouter|Apify|Hunter …` — pokazuje remaining + runway (dani). Ledger: `deploy-secrets.local/budget-burn-ledger.json`.

**Sledeći korak (TI):** pošalji `companyLegalName` / `companyTaxId` / `companyAddress` kad firma bude gotova; (opciono) Resend warmup pre masovnog outbounda.  
**Sledeći korak (JA):** #3b invoice PDF kad SMTP/COMMS; #6e seed CRM kad hoćeš outbound→checkout smoke.

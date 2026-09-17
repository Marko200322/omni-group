# LLC / TI handoff — šta TI moraš uraditi sutra

**Datum:** 2026-08-14 (ažurirano posle Atina widget + Instantly + dashboard UX)  
**Kontekst:** Kod je ažuriran za P0/P1/P2 + poslednji sprint (vidi §2). Sledeće stavke **ne mogu** bez tebe (LLC, ključevi, spoljni servisi, advokat).

---

## 0. Poslednji sprint u kodu (2026-08-14) — pre deploya

| Oblast | Promena |
|--------|---------|
| **Client portal — Atina** | Floating chat sa strane (`ClientAiAssistant`), ime **Atina**, support AI + portal navigacija |
| **Dashboard/admin UX** | Sidebar samo linkovi koji postoje (M3 lean); Invite → `#invite-users`; dead jump linkovi uklonjeni |
| **Consultations** | Nema lažnog “book call” — ide na `/contact` |
| **Billing stranice** | Success/cancel unutar client shell-a |
| **Pricing** | `?plan=enterprise` skroluje na enterprise blok |
| **Stripe deliverables** | Checkout paketa karticom (ne samo subscription planovi) — webhook obavezan |
| **Instantly.ai** | Outbound queue → Instantly kampanja (`OUTREACH_EMAIL_PROVIDER=instantly`) |
| **Hunting UI** | Job listing link; invite login URL klikabilan |

**Deploy pre prod:** web + atina-api (oba paketa iz ovog sprinta).

---

## 1. SUTRA — odmah posle LLC (15 min)

Popuni `deploy-secrets.local/deploy.config.json`:

```json
"companyLegalName": "Tvoja LLC pun naziv",
"companyTaxId": "EIN xx-xxxxxxx",
"companyAddress": "Ulica, Grad, State ZIP, USA",
"registrationEnabled": false,
"stripeSecretKey": "sk_live_...",
"stripePublishableKey": "pk_live_...",
"stripeWebhookSecret": "whsec_...",
"starterPriceId": "...",
"proPriceId": "...",
"enterprisePriceId": "...",
"instantly": {
  "apiKey": "...",
  "campaignId": "uuid-kampanje"
}
```

**Plaćanje:** primarni put = **Stripe** (paketi + planovi). IBAN/`manualPayment` ostavi prazno ili za edge case.

Zatim **bez full env regen** (čuva DB password):

```powershell
cd "C:\dev\omni group"
.\scripts\apply-integration-keys.ps1
.\scripts\set-warm-lean-mode.ps1
# ili pun sync kad si siguran:
# .\scripts\deploy-from-local-secrets.ps1
```

**Stripe webhook (obavezno):**  
`https://api.omnigrouptech.com/api/v1/payments/stripe/webhook`  
Events: `checkout.session.completed` (deliverables + subscription).

**Smoke:**

```powershell
.\scripts\e2e-billing-prod.ps1
# + ručno: /pricing → paket → Stripe checkout → webhook → fulfillment
# + dashboard: Atina bubble → chat (pravi login, ne demo)
```

---

## 2. Šta je urađeno u kodu (ne diraj)

| Oblast | Promena |
|--------|---------|
| Homepage | Uklonjen fake logo wall, M0 copy, 24h support |
| Footer/contact | Email, cookie link, impressum iz env |
| Legal | Cookie policy, refund u Terms, placeholder za LLC |
| Invoice preview | omnigrouptech.com brand |
| Keep-warm | Ping homepage `/` + health |
| Resend | PDF attachments na billing email |
| Security | Registration OFF default, API admin gates, contact rate limit |
| Infra defaults | PHASE v2, factory M3 u compose |
| Health | DB ping na `/health` |
| Hunt | processOutbound default false |
| Dashboard UX | Admin nav po fazi, billing shell, enterprise pricing anchor |
| Atina widget | Client chat bubble — ime **Atina** |
| Stripe deliverables | `POST …/stripe/deliverable-checkout` + webhook auto-fulfill |
| Instantly.ai | `INSTANTLY_*` + `OUTREACH_EMAIL_PROVIDER=instantly` |

---

## 3. TI MORAŠ — spoljni servisi (P0/P1)

| # | Zadatak | Kako | Procena |
|---|---------|------|---------|
| 1 | **www TLS** | Proveri `https://www.omnigrouptech.com` — ako FAIL, redeploy Caddy `--profile tls` | 15 min |
| 2 | **Uptime monitor** | [UptimeRobot](https://uptimerobot.com) — monitor `https://omnigrouptech.com/` + `https://api.omnigrouptech.com/health` | 10 min |
| 3 | **Resend billing** | Domain verified; `resend.contactFrom` = noreply@omnigrouptech.com | već delimično |
| 4 | **SMTP (opciono)** | Ako hoćeš SMTP umesto Resend za PDF: `smtp.enabled: true` u deploy.config | 30 min |
| 5 | **SSH key** | Generiši key, `sshKeyPath` u config, disable password na VPS | 30 min |
| 6 | **Offsite backup** | Contabo snapshot ILI rsync dump na drugi storage — koristi `scripts/vps-atina-pg-backup.sh` | 1 h |
| 7 | **Advokat / counsel** | Terms/Privacy review za US LLC + EU kupce | tvoj advokat |
| 8 | **Gmail deliverability** | SPF/DKIM/DMARC za omnigrouptech.com u Resend/DNS | 30 min |
| 9 | **Prva realna uplata** | M0 gate — zabeleži u checklist | ops |

---

## 4. TI MORAŠ — posle LLC (novo iz sprinta, pored P0/P1/P2)

| # | Zadatak | Kako | Prioritet |
|---|---------|------|-----------|
| 1 | **Deploy poslednjeg koda** | `set-warm-lean-mode.ps1` ili `deploy-from-local-secrets.ps1` | pre prodaje |
| 2 | **Stripe live (LLC)** | Business account, live keys, price IDs, webhook (§1) | **P0 prodaja** |
| 3 | **Atina chat live** | `AI_KEY`/`OPENROUTER_API_KEY` na API; klijent **pravi login** (demo ne chatuje) | visok |
| 4 | **Instantly.ai** | Nalog Growth+, API key, kampanja sa `{{subject}}`/`{{body_html}}`, Campaign ID u config | kad hoćeš outbound |
| 5 | **Instantly env** | `OUTREACH_EMAIL_PROVIDER=instantly`, `INSTANTLY_API_KEY`, `INSTANTLY_CAMPAIGN_ID` | uz #4 |
| 6 | **Resend** | I dalje za transakcione mailove (faktura, kontakt) — ne mešati sa cold outbound | P0/P1 |
| 7 | **Advokat** | Terms/Privacy/Cookie za US LLC + EU | trust |
| 8 | **Uptime + www TLS** | UptimeRobot + proveri `www` redirect | P0 ops |
| 9 | **SPF/DKIM/DMARC** | Resend DNS za omnigrouptech.com | deliverability |

---

## 5. TI MORAŠ — P2 (kasnije, ne blokira prvi Stripe sale)

| # | Zadatak | Napomena |
|---|---------|----------|
| 1 | **NeverBounce** | Pre M4 masovnog outbound |
| 2 | **Plausible/GA4** | Analytics |
| 3 | **M4 hunt send cron** | Tek posle warmup + 50 CRM + prva prodaja; `M4_OUTBOUND_SEND=1` |
| 4 | **HeyGen/D-ID** | Video avatar u Support sekciji (Atina widget = text AI) |
| 5 | **Intercom** | Opciono live chat pored Atine |
| 6 | **Nest/Python u prod** | **NE** — ostavi off |
| 7 | **850 matrix re-run** | `.\scripts\m4-launch-gate.ps1 -FullPackagesMatrix` |
| 8 | **2FA admin** | Backlog |
| 9 | **CDN Cloudflare** | Opciono |
| 10 | **CI u GitHub Actions** | `verify-monorepo.ps1` |
| 11 | **Rollback owner** | Upiši u CEO-G doc |
| 12 | **IBAN fallback** | Samo ako hoćeš ručnu uplatu pored Stripe |

---

## 6. Šta NE uključivati sutra

- `M4_OUTBOUND_SEND=1` / hunt cron
- `factoryPhaseAuto: true`
- `PAYMENTS_MODE=live` dok nemaš Stripe webhook + smoke
- Nest migrations na prod Postgres
- `YOUTUBE_PIPELINE_URL` na prod
- Full `deploy-from-local-secrets` sa env wipe ako nisi siguran u DB password

---

## 7. Checklist posle LLC + deploy

- [ ] companyLegalName / TaxId / Address u deploy.config
- [ ] Stripe live keys + price IDs + webhook test
- [ ] Deploy web + atina-api (Atina widget + Stripe deliverables + UX)
- [ ] Contact form → inbox
- [ ] Stripe paket checkout → fulfillment (ne samo IBAN)
- [ ] Atina chat sa pravim loginom na `/dashboard`
- [ ] (Opciono) Instantly kampanja + outbound smoke u admin Hunting
- [ ] www + uptime monitor
- [ ] Registracija zatvorena — test `/register` → 403

---

## 8. Kontakt za pitanja

Ako nešto pukne posle deploy-a:

```powershell
.\scripts\recover-api.ps1
.\scripts\sprint-prod-ready.ps1
```

**Bottom line:** Kod je spreman za LLC + Stripe + Atina widget. Ti: config → deploy → smoke Stripe + Atina → prva prodaja. Outbound (Instantly) i M4 mašina — posle prve prodaje.

---

## 9. Šta TI radi **pored** starog P0 / P1 / P2

| Već u P0/P1/P2 (ti) | Novo pored toga (ti) |
|---------------------|----------------------|
| LLC podaci na fakturi | **Stripe** kao primarni checkout (ne IBAN) |
| Resend, uptime, www TLS | **Deploy** poslednjeg sprinta |
| Advokat legal | **Atina**: proveri `AI_KEY` posle deploya |
| Registration OFF | **Instantly** (opciono): nalog + kampanja + env |
| SSH, backup | **Stripe webhook** — obavezan za karticu |
| — | Test Atina sa **pravim** nalogom (ne demo) |
| P2 Stripe (bio “kasnije”) | **Sada P0** — prva prodaja karticom |
| P2 M4 hunt / NeverBounce | I dalje **posle** prve prodaje |

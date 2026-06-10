# Kompletna lista do kraja — Admin vs Agent

**Cilj:** online poslovi (25 freelance kategorija) → prodaja → manual € → produkcija → (kasnije) Docker održavanje + Stripe.

**Docker:** radi (stack + `/health` OK).

**Kada admin završi svoju listu** → agent radi **AGENT** listu automatski.

Provera: `npm run check:readiness-100` (atina-platform/atina)

---

# DEO 1 — ADMIN (Marko) — uradi ovo prvo

Označavaj `[x]` kad je gotovo. **Bez ovoga agent ne može završiti prodaju i novac.**

## A0 — Obavezno odmah (1–2 dana)

- [ ] **OpenRouter** — dopuni kredit na nalogu (bio 402). Proveri u `.env`: `AI_URL`, `AI_KEY`
- [ ] **IBAN / manual plaćanje** — u `atina-platform/atina/.env`:
  - `MANUAL_PAYMENT_ACCOUNT_NAME`
  - `MANUAL_PAYMENT_IBAN`
  - `MANUAL_PAYMENT_BANK`
  - `PAYMENT_NOTIFY_EMAIL` = tvoj email
- [ ] **Email slanje** — jedno od:
  - `COMMS_URL` + `COMMS_KEY`, **ili**
  - `SMTP_ENABLED=true` + `SMTP_USER` + `SMTP_PASSWORD`
- [ ] **OUTREACH_FALLBACK_EMAIL** = tvoj email (test + fallback)
- [ ] **Scraper** (za leadove) — `SCRAPER_URL` + `SCRAPER_KEY` ako imaš agregator/Apify
- [ ] Pokreni: `cd atina-platform/atina && npm run checklist:apply-env` (dopuni prazno, ne briše postojeće)

## A1 — Domen i prodaja (nedelja 1–3)

- [ ] Kupi **domen** (npr. omnigroup.rs / .com) — ~€10–15/god
- [ ] Podesi **email** na domenu (`hello@...`) preko Resend / Google Workspace / hosting DNS
- [ ] **Warmup** 2–3 nedelje (5–20 mejlova/dan) — ili privremeno ostavi `OUTREACH_DEV_SEND_TO_FALLBACK=true` samo za test
- [ ] Kad domen spreman: `OUTREACH_DOMAIN_WARMUP_COMPLETE=true` (ukloni dev fallback u produkciji)
- [ ] **Google Meet** link u `.env`: `SALES_GOOGLE_MEET_URL` (besplatno)
- [ ] `SALES_MEETINGS_ENABLED=true` (već može biti u .env)

## A2 — Operativa kao admin (ongoing)

- [ ] Login: `admin@atina.io` / lozinka iz `.env` → **Admin panel**
- [ ] Kad klijent uplati manual checkout → **Admin → Pending payments → Confirm**
- [ ] Proveri da klijent ima **active** pretplatu u billing summary
- [ ] (Opciono) **Telegram**: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — obaveštenja tick/uplata
- [ ] (Opciono) **Kriptoman** — samo ako hoćeš USDT pre Stripe-a

## A3 — Produkcija na netu (kad hoćeš live URL)

- [ ] Nabavi **VPS** (Hetzner ~€5–12/mes) ili slično
- [ ] **Domen** usmeri na VPS (A record)
- [ ] Produkcijski `.env` na serveru (kopija lokalnog, `APP_URL=https://tvoj-domen`)
- [ ] TLS / HTTPS (Let's Encrypt)
- [ ] Javi agentu: URL produkcije + da li deploy ide na isti VPS

## A4 — Namerno NA KRAJ (ne diraj dok ne zaradiš)

- [ ] **Stripe** — firma + business nalog + `STRIPE_*` ključevi
- [ ] `PAYMENTS_MODE=live` ili hybrid
- [ ] Webhook na produkciji

## A5 — Ne troši vreme

- [ ] ~~Legacy SMB rollout~~ — fokus online poslovi (`AUTONOMY_ROLLOUT_SEGMENT=freelance`)
- [ ] ~~Docker factory reset~~ — gubi bazu
- [ ] ~~Admin panel redizajn~~ — koristi postojeći

---

# DEO 2 — AGENT (Cursor) — radi kad admin završi A0–A1

Agent **ne dira** admin confirm uplata ni kupovinu domena. Agent radi tehnički ostatak.

## G — Docker / baza (agent, Docker već radi)

- [ ] Migracija `019_platform_evolution` u PostgreSQL (docker exec migrate ako host npm ne radi)
- [ ] Provera freelance rollout **25/25** (`AUTONOMY_ROLLOUT_SEGMENT=freelance`)
- [ ] Doterivanje preostalih vertikala ako fale (smoke + async rollout)
- [ ] `npm run sync:generated-verticals` → web katalog
- [ ] Evolution tick + seed task queue u bazi

## B — Katalog online poslova

- [ ] Seed / rollout freelance kategorija do `ready`
- [ ] Research + artefakti + outbound draft po vertikalu
- [ ] Quality smoke po kategoriji
- [ ] Integracija generisanih landings u products/marketing gde treba

## C — Automatska prodaja (tehnički)

- [ ] Verifikacija client-hunter + scraper live
- [ ] CRM lead iz hunt-a (kod postoji — test end-to-end)
- [ ] Outbound `process-send` — test sa COMMS/SMTP kad admin podesi
- [ ] Sales meeting / deal-offer flow test (bez admin UI promena)

## D — Naplata (tehnički, bez Stripe)

- [ ] Manual checkout E2E test
- [ ] Admin confirm flow test (admin radi klik, agent piše test/dok)
- [ ] `feedback/sync` kad postoji prva uplata

## E — Samorazvoj

- [ ] Autonomy scheduler + tick verifikacija
- [ ] Platform evolution tick (catalog_sync, test gate, deploy prep)
- [ ] `AUTONOMY_AUTO_DEPLOY` + git commit generisanih pack-ova
- [ ] Unit/integration testovi autonomy modula (Node 20)
- [ ] (Kasnije) Evolution agent — auto izmene koda (E3 pun scope)

## F — Deploy na net (agent + admin VPS)

- [ ] Deploy skripta / docker-compose prod
- [ ] `omnigroup-web` build + env produkcija
- [ ] Backup + monitoring hook (runbooki već u docs/)
- [ ] Smoke: javni URL → login → manual checkout

## H — Stripe (agent tek posle admin A4)

- [ ] Stripe checkout + webhook wiring test
- [ ] Hybrid manual + stripe

---

# DEO 3 — Redosled i procena

```
ADMIN A0 (env, IBAN, email, AI kredit)
    ↓
AGENT G + B (baza, 25/25 freelance, sync)
    ↓
ADMIN A1 (domen, warmup)  ∥  AGENT C (outbound/CRM test)
    ↓
ADMIN: prvi klijent + Confirm uplata
    ↓
AGENT D + E (feedback, evolution, deploy prep)
    ↓
ADMIN A3 (VPS) → AGENT F (produkcija)
    ↓
ADMIN A4 + AGENT H (Stripe) — poslednje
```

| Ko | Realno vreme |
|----|----------------|
| **Admin A0** | 2–6 h |
| **Admin A1** | 2–3 nedelje (warmup) |
| **Agent G+B+C+D+E** | 3–7 radnih dana |
| **Admin A3 + Agent F** | 2–5 dana |
| **Stripe (A4+H)** | kad firma zaradi |

---

# DEO 4 — Trenutno stanje (snapshot)

| Metrika | Vrednost |
|---------|----------|
| Docker / API | OK |
| Rollout (API, legacy red) | ~36/50 kategorija, ~69% vertikala |
| Fokus | 25 online kategorija (freelance segment u kodu) |
| Stripe | Odloženo |
| Admin panel | Ostaje adminu — agent ne refaktorše |

---

**Kad admin označi A0 (minimum) gotovim — javi "admin A0 gotov" i agent kreće od G+B.**

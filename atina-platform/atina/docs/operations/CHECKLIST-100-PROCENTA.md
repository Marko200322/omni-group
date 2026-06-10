# Checklist — 100%

**Cilj:** platforma uči, istražuje, prodaje, naplaćuje (manual/kripto), nadograđuje sebe i deployuje na net.

**Redosled:** prvo **A → F**, na **kraju** **G (Docker)** pa **H (Stripe)**.

**Provera napretka (env + fajlovi, bez Docker/Stripe u oceni):**
```powershell
cd atina-platform/atina
npm run check:readiness-100
```

Označavaj `[x]` kad je stavka stvarno gotova i verifikovana.

---

## Legenda

| Simbol | Značenje |
|--------|----------|
| `[ ]` | Nije urađeno |
| `[x]` | Gotovo + provereno |
| `⏸` | Na kraju liste (G Docker, H Stripe) |

---

## A — Kod i arhitektura → 100%

### A1 Agregatori (live, ne simulated)
- [ ] `AI_URL` + `AI_KEY` (OpenRouter) — research + outreach AI
- [ ] `SCRAPER_URL` + `SCRAPER_KEY` — pravi leadovi i research
- [ ] `COMMS_URL` + `COMMS_KEY` **ili** `SMTP_ENABLED=true` + SMTP kredencijali
- [ ] `PAYMENTS_MODE=manual` (Stripe tek u **Fazi H**)
- [ ] `INFRASTRUCTURE_URL` + `INFRASTRUCTURE_KEY` — CI/CD deploy trigger
- [ ] `npm run check:readiness-100` — sekcija A ≥ 80%

### A2 Autonomy uključen
- [ ] `AUTONOMY_ENABLED=true`
- [ ] `AUTONOMY_AUTO_START_SCHEDULER=true`
- [ ] `AUTONOMY_ROLLOUT_SEGMENT=freelance` (samo online poslovi)
- [ ] `AUTONOMY_CATEGORY_ROLLOUT_ENABLED=true`
- [ ] `processAllVerticals=true` u scheduleru (već u kodu)

### A3 Web ↔ API (BFF)
- [ ] `apps/omnigroup-web/.env.local` → `NEXT_PUBLIC_ATINA_API_BASE` (API URL kad bude live)
- [ ] Login, dashboard, admin, billing panel — spremni u kodu
- [ ] AutonomyLoopPanel — fokus 25 online kategorija

### A4 Platform evolution (samomodifikacija)
- [ ] Migracija `019_platform_evolution.sql` primenjena (**Faza G** kad Docker radi)
- [ ] Evolution tick: metrike → plan → izmena koda → test → commit
- [ ] `npm run sync:generated-verticals` — landings u web index
- [ ] CI pipeline: test + build pre deploya

**Verifikacija A:** `check:readiness-100` — sekcija A ≥ 80%

---

## B — Online poslovi katalog → 100%

> Fokus: **25 freelance kategorija**. Legacy SMB = dodatak (`AUTONOMY_ROLLOUT_SEGMENT=legacy_smb`).

### B1 Offline / env (pre Dockera)
- [ ] Taxonomy + delivery profili — 25 kategorija u kodu (gotovo)
- [ ] `AUTONOMY_ROLLOUT_SEGMENT=freelance`
- [ ] Smoke skripte spremne (`smoke-category-rollout.ps1`, `resume-rollout-when-docker-ready.ps1`)

### B2 Sa bazom (**verifikacija u Fazi G**)
- [ ] Seed — svi freelance vertikali
- [ ] Rollout **25/25** kategorija `ready`
- [ ] Svaki vertikal: research + artefakti + outbound draft
- [ ] AI + scraper obogaćen research (ne samo šabloni)
- [ ] `npm run sync:generated-verticals`
- [ ] Quality gate po kategoriji

**Verifikacija B:** `categories/status` → 25/25, completion ≥ 95% (posle **G**)

---

## C — Automatska prodaja → 100%

### C1 Leadovi
- [ ] Scraper — `scraper_configured: true`
- [ ] Client-hunter hunt — stvarni linkovi u scrapeContext
- [ ] CRM pipeline — lead → draft → follow-up

### C2 Outbound
- [ ] `OUTREACH_FALLBACK_EMAIL`
- [ ] Domen zagrejan + `OUTREACH_DOMAIN_WARMUP_COMPLETE=true`
- [ ] `OUTREACH_DAILY_CAP` (npr. 20)
- [ ] `outbound/process-send` — bar 1 mejl/dan
- [ ] draft → queued → sent

### C3 Prodaja
- [ ] `SALES_MEETINGS_ENABLED=true` + Meet/Zoom URL
- [ ] Sales avatar + booking
- [ ] Deal-offer nakon odgovora

**Verifikacija C:** `sent` > 0; bar 1 sastanak / nedelju

---

## D — Prikupljanje para → 100% (manual / kripto)

> **Stripe = Faza H (poslednja).**

### D1 Manual checkout
- [ ] `PAYMENTS_MODE=manual`
- [ ] `MANUAL_PAYMENT_ACCOUNT_NAME`, `IBAN`, `BANK`
- [ ] Checkout → reference + instrukcije
- [ ] Admin confirm → pretplata aktivna
- [ ] `PAYMENT_NOTIFY_EMAIL`

### D2 Kriptoman (opciono)
- [ ] `KRIPTOMAN_ENABLED=true` + API
- [ ] USDT/BTC checkout → aktivacija

### D3 Revenue → autonomy
- [ ] Bar 1 completed payment
- [ ] `feedback/sync` ažurira prioritete
- [ ] Reinvest povećava budžet

**Verifikacija D:** manual checkout → subscription `active`

---

## E — Samorazvoj → 100%

### E1 Poslovni loop
- [ ] Tick / category rollout na schedule-u
- [ ] Budget iznad rezerve
- [ ] Telegram obaveštenja
- [ ] Revenue feedback prioritizacija

### E2 Deploy vertikala
- [ ] `AUTONOMY_GIT_REPO_PATH` → monorepo root
- [ ] `AUTONOMY_AUTO_DEPLOY=true` (kad infra spreman)
- [ ] Git commit generisanih pack-ova + CI trigger

### E3 Evolution agent
- [ ] Task queue (`platform_evolution_tasks`)
- [ ] KPI → plan → izmene koda → test → commit
- [ ] Human approve ili auto-merge (config)

### E4 Testovi
- [ ] `npm test` na Node 20
- [ ] Evolution pokreće test pre commita
- [ ] Coverage: autonomy, payments manual, outbound

**Verifikacija E:** tick log + commit SHA + CI green

---

## F — Deploy na net → 100%

- [ ] Produkcijski host — API + DB + Redis (može biti VPS bez lokalnog Dockera)
- [ ] `omnigroup-web` na domenu
- [ ] TLS / HTTPS
- [ ] Produkcijski `.env` — agregatori iz A
- [ ] Backup DB (`db-backup-restore-runbook.md`)
- [ ] Monitoring (`monitoring-alert-channel-policy.md`)
- [ ] Rollback (`deploy-rollback-checklist.md`)

**Verifikacija F:** javni URL → login → manual checkout → health 7 dana

---

## G — Docker (lokalni stack) ⏸ **NA KRAJU**

> Radi **posle A–F** kad imaš **15+ GB** na C: ili kad ti treba lokalni dev stack.

- [ ] ⏸ Osloboditi **15+ GB** na C:
- [ ] ⏸ Docker Desktop (`docker ps`)
- [ ] ⏸ `docker compose up -d`
- [ ] ⏸ `GET /health` → 200
- [ ] ⏸ Migracije (ukl. 018 outbound, 019 evolution)
- [ ] ⏸ Freelance rollout 25/25 u bazi
- [ ] ⏸ `npm run smoke:resume-rollout` ili `-SkipRollout` samo stack

**Verifikacija G:** `powershell -File .\scripts\resume-rollout-when-docker-ready.ps1`

---

## H — Stripe ⏸ **POSLEDNJA**

> Tek kad **firma zaradi** preko manual/kripto i imaš registrovanu firmu.

- [ ] ⏸ Firma + Stripe business nalog
- [ ] ⏸ `STRIPE_SECRET_KEY`, webhook secret, price ID-ovi
- [ ] ⏸ `PAYMENTS_MODE=live` ili hybrid
- [ ] ⏸ Webhook na produkciji
- [ ] ⏸ PayPal live (opciono)

---

## Redosled (fiksno)

```
A → B → C → D → E → F → G (Docker) → H (Stripe)
```

1. **A** — env, agregatori, autonomy freelance  
2. **B** — katalog (B1 odmah, B2 posle G ako lokalno)  
3. **D** — manual checkout + prvi klijent  
4. **C** — outbound + leadovi  
5. **E** — evolution + test loop  
6. **F** — produkcija na netu  
7. **G** — Docker lokalno (dev + rollout u lokalnoj bazi)  
8. **H** — Stripe  

---

## Praćenje ukupnog %

| Faza | Oblast | Kad je 100% |
|------|--------|-------------|
| A | Kod | Agregatori + evolution spremni |
| B | Katalog | 25/25 freelance (+ web sync) |
| C | Prodaja | Mejlovi + CRM + sastanci |
| D | Para | Manual/kripto + reinvest |
| E | Samorazvoj | Tick + evolution + test |
| F | Net | Javni produkcijski URL |
| G | Docker ⏸ | Lokalni stack + migracije + rollout |
| H | Stripe ⏸ | Automatska naplata kartice |

**Poslovno 100% (pre Stripe-a):** A + B + C + D + E + F (+ G ako koristiš lokalni Docker).  
**Potpuno 100%:** sve faze uključujući **H**.

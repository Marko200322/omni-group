# Admin — KOMPLETNA lista za 100% celog projekta

**Cilj:** jedna lista. Ti uradiš **sve** stavke ispod (dostava + ručni koraci). Agent zatim **zvanično završava** ceo dogovoreni Omni Group monorepo (kod, testovi, migracije, smoke, commit/PR, preostali inženjering).

**Kad je lista 100% `[x]`**, u Cursor napiši samo:

> **Admin komplet gotov.** Okruženje: [lokalno | staging URL | prod URL]. Plaćanja: [manual | stripe test | stripe live]. Commit/push: [da | ne]. Vision/K8s: [N/A].

**Ne šalji tajne u chat** — samo u `.env` / `.env.local` na disku.

---

## Šta znači „100% celog sistema“ (jednom)

| Uključeno u 100% | **NIJE** u 100% (eksplicitno van opsega) |
|------------------|----------------------------------------|
| CEO matrica A–H sve `[x]` + Pass evidencije | Kubernetes / Helm / multi-cluster |
| Atina Node + Nest + Python + Next web | 125k profila / edge swarm iz PDF-a |
| Live ili staging sa pravim ključevima | Stranični „aligned“ svaki PDF red-po-red |
| Git na GitHubu, CI zelen, rollback plan | Novi proizvod koji nije u repou |

**Posle tvoje liste + agenta:** **100%** = gornja leva kolona. Vision = poseban projekat ako ikad zatreba.

---

## DEO 1 — Dostavi na disk (fajlovi, bez Git-a)

### 1.1 `atina-platform/atina/.env` (glavni sistem)

Šablon: [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example)  
Detalj po modulu: [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md)

#### A) Osnova (obavezno)

- [ ] `NODE_ENV` — `development` lokalno / `production` na serveru
- [ ] `APP_URL` — https domen na prod
- [ ] `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_SSL`
- [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (ako managed)
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET` (min 32 znaka, random)
- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≠ `Admin@123456` na prod)
- [ ] `PHASE` — npr. `v1`

#### B) Agregatori (obavezno za pun SaaS)

- [ ] `AI_URL` + `AI_KEY`
- [ ] `COMMS_URL` + `COMMS_KEY` **ILI** `SMTP_USER` + `SMTP_PASSWORD` + `SMTP_ENABLED=true` + `EMAIL_FROM`
- [ ] `SCRAPER_URL` + `SCRAPER_KEY`
- [ ] `STORAGE_URL` + `STORAGE_KEY`
- [ ] `BUSINESS_AND_DEV_URL` + `BUSINESS_AND_DEV_KEY`
- [ ] `FINANCE_URL` (može prazno ako ide direktno Stripe)
- [ ] `INFRASTRUCTURE_URL` + `INFRASTRUCTURE_KEY` (ako imaš ops servis)

#### C) Plaćanja (obavezno jedan režim)

**Opcija 1 — Stripe (preporučeno kad imaš firmu):**

- [ ] `FINANCE_KEY` / `STRIPE_SECRET_KEY` — `sk_test_` staging, `sk_live_` prod
- [ ] `STRIPE_WEBHOOK_SECRET` — `whsec_...`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STARTER_PRICE_ID`, `PRO_PRICE_ID`, `ENTERPRISE_PRICE_ID`
- [ ] `PAYMENTS_MODE=sandbox` ili `live`

**Opcija 2 — Bez Stripe (manual):**

- [ ] `PAYMENTS_MODE=manual`
- [ ] `MANUAL_PAYMENT_*` (IBAN, referenca, valuta…)
- [ ] `PAYMENT_NOTIFY_EMAIL` ili `ADMIN_EMAIL`

#### D) Ecosystem (obavezno za „ceo“ blueprint u kodu)

- [ ] `YOUTUBE_PIPELINE_URL` (ako vrtiš pipeline servis) + `YOUTUBE_*` po potrebi
- [ ] `ELEVENLABS_API_KEY` (support avatar / TTS)
- [ ] `APEX_FLUX_*` + `APEX_LIVE_PORTRAIT_*` (ako koristiš Apex mediju)
- [ ] `STEAM_WEB_API_KEY` (OmniGame)
- [ ] `CRAFTOR_*` po `.env.example` ako koristiš live deploy
- [ ] `CAPTCHA_*`, `DOMAIN_*`, `WEB3_*` ako su u tvom planu
- [ ] `PAYPAL_*`, `WISE_*` ako uključuješ alternativna plaćanja
- [ ] Support/video: `SUPPORT_*`, `ZOOM_*`, `SUPPORT_GOOGLE_MEET_URL` po [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md) §2b

#### E) Forge / Python vault (ako zajednički deploy)

- [ ] `FORGE_VAULT_PATH` usklađen sa Python `VAULT_PATH` / docker volume

- [ ] **Fajl sačuvan, nije u Git-u**

**Provera:**
```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\check-atina-aggregators.ps1
.\scripts\check-stripe-env.ps1
```
- [ ] Obe skripte **PASS** (ili dokumentovano: manual mode, Stripe preskočen)

---

### 1.2 `apps/omnigroup-web/.env.local`

- [ ] `NEXT_PUBLIC_ATINA_API_BASE` — lokalno `http://127.0.0.1:3000` ili staging/prod API URL
- [ ] `SESSION_SECRET` — random 32+
- [ ] `NEXT_PUBLIC_SITE_URL` — https marketing domen
- [ ] `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` (kontakt forma uživo)

- [ ] Fajl sačuvan, nije u Git-u  
- [ ] `.\scripts\test-contact-resend.ps1` — PASS (ako Resend)

---

### 1.3 `atina-system/.env` (Nest — obavezno za 100% CEO C)

- [ ] `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- [ ] `JWT_SECRET` (32+)
- [ ] `REDIS_HOST` (ako queue modul na prod)
- [ ] **Prod:** `TYPEORM_SYNC=false`
- [ ] `NODE_ENV=production` na prod serveru

- [ ] Fajl na serveru / lokalno za migrate, nije u Git-u

---

### 1.4 `tools/youtube-pipeline/.env` (ako koristiš OmniTube live)

- [ ] Redis/Celery/FFmpeg putanje po [`tools/youtube-pipeline/.env.example`](../tools/youtube-pipeline/.env.example)
- [ ] `YOUTUBE_*` ključevi ako ide upload

- [ ] Servis pokrenut i dostupan na `YOUTUBE_PIPELINE_URL` iz Atina `.env`

---

## DEO 2 — Dostavi informacije (tekst u chat, bez tajni)

- [ ] **GitHub:** `owner/repo` URL (npr. `Marko200322/omni-group`)
- [ ] **Da li agent sme:** `git push` na `main` — **da / ne**
- [ ] **Lokalni portovi** ili **staging/prod URL-ovi:**
  - Atina API: `http://127.0.0.1:3000` ili `https://api...`
  - Nest: `http://127.0.0.1:3001` ili `https://nest...`
  - Web: `http://127.0.0.1:3002` ili `https://www...`
- [ ] **Hosting:** VPS / Railway / Render / drugo + kako deployuješ (SSH, panel, CI)
- [ ] **Stripe webhook URL** koji si uneo u Stripe dashboard (tačan path)
- [ ] **Režim plaćanja:** manual / stripe test / stripe live
- [ ] **Vision K8s:** potvrđuješ **N/A** za ovaj projekat (100% bez toga)

---

## DEO 3 — Ti ručno uradiš (agent ne može umesto tebe)

### 3.1 Mašina i repo

- [ ] Disk **≥ 5 GB** slobodno (`.\scripts\disk-report.ps1`)
- [ ] Docker Desktop radi (ako koristiš compose)
- [ ] Postgres za Nest **čist** ili usklađen sa migracijama ([`scripts/README.md`](../scripts/README.md) Port mismatch)

### 3.2 GitHub (CEO A)

- [ ] Repo na GitHub-u, `git remote` podešen
- [ ] Branch protection na `main` — PR obavezan ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md))
- [ ] Obavezni CI check-ovi (5 jobova) ako želiš pun gate
- [ ] Popunjen [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) → **Pass**
- [ ] `[x]` CEO sekcija A u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md)

### 3.3 Staging (pre prod)

- [ ] Deploy Atina + Redis + Postgres na staging
- [ ] Deploy web (Next) na staging
- [ ] `npm run migrate` na staging bazi (Atina)
- [ ] Nest `migration:run` na staging bazi
- [ ] `npm run smoke:all` u `atina-platform/atina` na **staging URL**
- [ ] `.\scripts\smoke-stack.ps1` (tri stub) na staging
- [ ] Stripe webhook test event → **200** na staging API
- [ ] Jedan test email (SMTP ili COMMS) stigao u inbox

### 3.4 Produkcija (CEO C + CEO G)

- [ ] Backup prod baza (Nest + Atina ako odvojene)
- [ ] Nest prod: `TYPEORM_SYNC=false` + `migration:run` — [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md)
- [ ] Popunjen [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) → **Pass**
- [ ] `[x]` CEO sekcija C u CEO matrici

**CEO G — redom:**

- [ ] 1. Prod `npm run build` (Atina) na serveru/CI
- [ ] 2. Migracije pregledane na staging, primenjene na prod
- [ ] 3. Prod `.env` na hostu (Atina + web + Nest) — [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md)
- [ ] 4. Live plaćanja (Stripe live **ili** manual prod režim) + webhook
- [ ] 5. SMTP/COMMS prod test
- [ ] 6. `npm run smoke:all` na **prod API URL**
- [ ] 7. Admin rute / monitoring provereni
- [ ] 8. Rollback plan zapisан — [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)
- [ ] Popunjen [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) → **Pass**
- [ ] Svih **8** stavki CEO G → `[x]` u CEO matrici

### 3.5 CI i mirror (N2)

- [ ] Posle agentovog push-a: **CI (monorepo)** zelen na `main` ([`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md))
- [ ] Popunjen [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md) ako koristiš GitHub
- [ ] _(opciono)_ Pun `.\scripts\verify-monorepo.ps1` + novi Val u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md)

### 3.6 Reference materijal

- [ ] PDF-ovi vraćeni u `sve/` (OneDrive/Git) **ili** prihvaćeno: trag samo u `docs/nivo3-wave-a/`

---

## DEO 4 — Agent završava (posle tvoje poruke „Admin komplet gotov“)

Ne moraš ovo raditi — agent radi:

| # | Zadatak |
|---|---------|
| 1 | `npm run build` + `npm run test:ci` (Atina) — sve zeleno |
| 2 | `python -m pytest -q` (koren) |
| 3 | `npm run verify:n1` ili `verify:ci` (Nest) |
| 4 | `npm run migrate` + provera `011_system_alerts` |
| 5 | `npm run smoke:all` (kad API radi) |
| 6 | Commit + push **celog** repoa (bez `.env`, `.env.local`) |
| 7 | F4-6, C-S-R dug, E2E jedan tok — inženjerski opseg |
| 8 | Ažurira handoff / checkliste u `docs/` |
| 9 | Uputstvo za sve što u DEO 3 nije mogao bez tvog servera |

---

## DEO 5 — Konačna provera 100%

Kad su **svi** `[x]` u DEO 1–3 i agent završi DEO 4:

| Provera | Očekivano |
|---------|-----------|
| [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) | **0** otvorenih `- [ ]` u A–H (68/68) |
| [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) | Prazno / zatvoreno |
| `check-atina-aggregators.ps1` | PASS |
| `npm run test:ci` | PASS na `main` |
| Smoke na prod/staging URL | PASS u evidenciji |
| **Procena** | **100%** celog dogovorenog sistema |

---

## Jedna strana — štikliraj redom

```
□ 1.1  atina .env — komplet (A+B+C+D+E)
□      check-atina-aggregators + check-stripe-env PASS
□ 1.2  omnigroup-web .env.local
□ 1.3  atina-system .env (TYPEORM_SYNC=false na prod)
□ 1.4  youtube-pipeline (ako treba)
□ 2    GitHub URL + URL-ovi + hosting + webhook + odluke u chat
□ 3.1  Disk + Docker + Postgres OK
□ 3.2  GitHub main + GIT-A evidencija Pass
□ 3.3  Staging deploy + migrate + smoke PASS
□ 3.4  Prod: TYPEORM + CEO G 8 koraka + evidencija Pass
□ 3.5  CI zelen na main
□ 3.6  PDF u sve/ (opciono)
→ Poruka agentu: "Admin komplet gotov..."
□ 4    Agent: test + migrate + commit + ostatak koda
□ 5    CEO matrica 68/68 → 100%
```

---

## Reference

| Dokument | Uloga |
|----------|--------|
| [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) | Detalj CEO koraka 1–4 |
| [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md) | Svaki ključ |
| [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md) | Prod env matrica |
| [`PUT-NA-100-PLAN.md`](./PUT-NA-100-PLAN.md) | Agent faze posle tebe |
| [`ADMIN-DOSTAVA-PRE-AGENT.md`](./ADMIN-DOSTAVA-PRE-AGENT.md) | Kraća verzija (samo pre-agent) |

*Ovo je **jedina** kompletna admin lista za 100% celog projekta (A+B).*

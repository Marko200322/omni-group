# Admin — šta dostaviš i uradiš (pa agent završava ostatak)

> **Kompletan sistem 100% (jedna lista, bez delova):** koristi **[`ADMIN-KOMPLET-100-LISTA.md`](./ADMIN-KOMPLET-100-LISTA.md)** — ovo ispod je samo skraćena verzija „pre agenta“.

**Za:** vlasnik / admin (Marko)  
**Agent radi posle:** commit, testovi, smoke, migracije, F4-6, C-S-R, PR — vidi [`PUT-NA-100-PLAN.md`](./PUT-NA-100-PLAN.md)

**Pravilo:** tajne **samo** u `.env` fajlovima na disku — **ne** u Git, **ne** u chat porukama.

**Kad završiš ovu listu, u Cursor napiši:**
> Env gotov. Okruženje: [lokalno | staging URL]. Plaćanja: [manual | stripe test]. Commit/push: [da | ne].

---

## Legenda

| Oznaka | Značenje |
|--------|----------|
| 🔴 | Obavezno pre nego agent krene na smoke/live |
| 🟡 | Preporučeno (pun ecosystem) |
| ⚪ | Opciono |
| 👤 | Samo ti (agent ne može umesto tebe) |

---

## Faza 0 — Priprema (5 min)

- [ ] 👤 Repo na disku: `c:\Users\Marko Kosic\OneDrive\Desktop\omni group`
- [ ] 👤 Disk **≥ 5 GB** slobodno na `C:` (za pun [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) — job **Python (Doslednost dok + pytest)** · [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); uključuje **apps/omnigroup-web** osim **`-SkipOmnigroupWeb`**; posle servisa **`npm run smoke:all`**)
- [ ] 👤 Docker Desktop uključen (ako koristiš compose lokalno)
- [ ] 👤 Odluka zapisana: **Vision K8s** = **N/A** (100% = A+B, ne ceo PDF vision)

---

## Faza 1 — Fajlovi sa tajnama (🔴)

### 1.1 Atina Node — `atina-platform/atina/.env`

Popuni po [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md). Minimum:

| # | Stavka | Primer |
|---|--------|--------|
| 1 | `AI_URL` + `AI_KEY` | OpenRouter / gateway |
| 2 | `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | Postgres |
| 3 | `REDIS_HOST` (+ `REDIS_PASSWORD` ako treba) | Redis |
| 4 | `JWT_SECRET`, `JWT_REFRESH_SECRET` | min 32 znaka, random |
| 5 | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin nalog |
| 6 | Email: **COMMS** `COMMS_URL` + `COMMS_KEY` **ili** `SMTP_USER` + `SMTP_PASSWORD` + `SMTP_ENABLED=true` | jedan kanal |
| 7 | Plaćanja — **izaberi jedno:** | |
| 7a | **Stripe test:** `FINANCE_KEY` (`sk_test_`), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STARTER/PRO/ENTERPRISE_PRICE_ID` | |
| 7b | **Bez firme:** `PAYMENTS_MODE=manual`, `MANUAL_PAYMENT_*`, `PAYMENT_NOTIFY_EMAIL` | |

- [ ] 🔴 Fajl `.env` sačuvan (NE commituj)

**Provera (ti pokreneš):**
```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\check-atina-aggregators.ps1
.\scripts\check-stripe-env.ps1
```
- [ ] 🔴 Obe skripte **PASS** (ili svesno prihvatiš manual mode bez Stripe)

---

### 1.2 Web — `apps/omnigroup-web/.env.local`

| # | Stavka |
|---|--------|
| 1 | `NEXT_PUBLIC_ATINA_API_BASE` — `http://127.0.0.1:3000` (lokalno) ili staging API URL |
| 2 | `SESSION_SECRET` — random 32+ znakova |
| 3 | _(opciono)_ `RESEND_API_KEY`, `CONTACT_EMAIL_FROM`, `CONTACT_EMAIL_TO` |

- [ ] 🔴 `.env.local` sačuvan (NE commituj)
- [ ] ⚪ Test: `.\scripts\test-contact-resend.ps1` (ako ima Resend)

---

### 1.3 Nest (samo ako posebno vrtiš `atina-system`)

- [ ] 🟡 `atina-system/.env` — `POSTGRES_*`, `JWT_SECRET`, `TYPEORM_SYNC=false` na prod

---

## Faza 2 — Odluke (upiši u chat jednom)

- [ ] 🔴 **Okruženje:** samo lokalno **ili** staging URL API-ja: `https://...`
- [ ] 🔴 **Plaćanja:** `manual` **ili** `stripe test` **ili** `stripe live` (kasnije)
- [ ] 🔴 **Agent sme commit + push?** `da` / `ne`
- [ ] 🟡 **PDF u `sve/`:** vratiću sa OneDrive / Git **ili** preskačem

---

## Faza 3 — Infrastruktura (👤 ako ideš na internet)

Preskoči ako radiš **samo lokalno** prvo.

| # | Šta dostaviš agentu (tekst, bez lozinki) |
|---|------------------------------------------|
| 1 | Staging API URL + Web URL |
| 2 | Prod API URL (kad bude) |
| 3 | Gde hostuješ (VPS, Railway, Render, …) |
| 4 | Stripe webhook URL koji si uneo u Stripe dashboard |
| 5 | Da li Postgres/Redis su managed ili Docker na serveru |

- [ ] 👤 Staging podignut **ili** eksplicitno „samo lokalno za sada“

---

## Faza 4 — GitHub i produkcija (👤 — agent ne može kliknuti)

Redom [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md). Može **posle** agentovog commita.

### 4.1 Git (CEO A)

- [ ] 👤 Repo na GitHub-u, `origin` podešen
- [ ] 👤 `main` zaštićen, PR obavezan — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)
- [ ] 👤 Popunjen [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) → `[x]` u CEO matrici

### 4.2 Nest prod baza (CEO C)

- [ ] 👤 Backup baze
- [ ] 👤 `TYPEORM_SYNC=false` na prod
- [ ] 👤 `npm run migration:run` u `atina-system` na prod DB
- [ ] 👤 [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) → `[x]`

### 4.3 Atina prod (CEO G — 8 stavki)

- [ ] 👤 Prod build na serveru
- [ ] 👤 Staging migracije proverene
- [ ] 👤 Prod `.env` na hostu (ne u gitu)
- [ ] 👤 Live plaćanja + webhook test event
- [ ] 👤 SMTP / email test
- [ ] 👤 `npm run smoke:all` na **prod/staging URL** (ne samo localhost)
- [ ] 👤 Admin monitoring proveren
- [ ] 👤 Rollback plan zapisан
- [ ] 👤 [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) → sve `[x]`

### 4.4 CI (opciono N2)

- [ ] 👤 Zeleni **CI (monorepo)** na `main` posle merge-a — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md)

---

## Faza 5 — Prošireno (🟡 — ne blokira agenta)

U `atina-platform/atina/.env` kad imaš vreme:

- [ ] `SCRAPER_URL` + `SCRAPER_KEY`
- [ ] `STORAGE_URL` + `STORAGE_KEY`
- [ ] `BUSINESS_AND_DEV_URL` + `BUSINESS_AND_DEV_KEY`
- [ ] ⚪ `YOUTUBE_*`, `ELEVENLABS_*`, `APEX_*`, `STEAM_WEB_API_KEY`, PayPal/Wise, CAPTCHA, DOMAIN, WEB3

Detalji: [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md) sekcije 4–13.

---

## Šta agent radi kad ti završiš Fazu 1–2

| Korak | Agent |
|-------|--------|
| 1 | `npm run build` + `npm run test:ci` |
| 2 | `npm run migrate` (ukl. `011_system_alerts`) |
| 3 | `npm run smoke:all` (Atina podignut) |
| 4 | Commit/push WIP (**bez** `.env`) ako si dao dozvolu |
| 5 | F4-6, C-S-R, E2E, doc — inženjerski 100% |
| 6 | Uputstvo za Fazu 4 (prod) — ti zatvaraš CEO evidencije |

---

## Brza checklista (štikliraj)

```
ADMIN — PRE AGENT
[ ] atina .env — minimum (AI, DB, Redis, JWT, admin, email, plaćanja)
[ ] check-atina-aggregators.ps1 PASS
[ ] check-stripe-env.ps1 PASS (ili manual mode)
[ ] omnigroup-web .env.local (SESSION_SECRET + ATINA URL)
[ ] Poruka agentu: env gotov + okruženje + plaćanja + commit da/ne

ADMIN — POSLE AGENTA (ti)
[ ] GitHub main + PR
[ ] Nest prod migracije
[ ] CEO G + smoke na pravom URL-u
[ ] Evidencije GIT-A / TYPEORM-PROD / CEO-G
```

---

## Reference

| Dokument | Svrha |
|----------|--------|
| [`VLASNIK-SAKUPLJANJE-KLJUCEVA.md`](./VLASNIK-SAKUPLJANJE-KLJUCEVA.md) | Svi ključevi po modulu |
| [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) | CEO 10 stavki korak-po-korak |
| [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md) | Prod matrica env varijabli |
| [`PUT-NA-100-PLAN.md`](./PUT-NA-100-PLAN.md) | Šta znači 100% A+B |

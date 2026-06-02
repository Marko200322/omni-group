# Go-live 100% — Omni Group monorepo

Jedna lista za **ovaj projekat** (Atina + web + billing + deploy). Označi `[x]` kad je završeno.

## 1. Kod i gate (agent + lokalno)

- [ ] **Restart Atina posle code fix-a:** `.\scripts\restart-atina-dev.ps1` (ili `docker compose build app && docker compose up -d app`)
- [ ] `cd atina-platform/atina && npm run migrate`
- [ ] `npm run test:ci` PASS
- [ ] `cd apps/omnigroup-web && npm run build` PASS
- [ ] `npm run smoke:integration` PASS
- [ ] `npm run e2e:billing` PASS (iz `apps/omnigroup-web`)
- [ ] `verify-monorepo.ps1` PASS (iz korena repoa)
- [ ] Git commit + push (bez `.env` fajlova)

## 2. Env — lokalno / staging

### `atina-platform/atina/.env`

- [ ] `PAYMENTS_MODE=manual` + `MANUAL_PAYMENT_*` (pravi IBAN)
- [ ] `PAYMENT_NOTIFY_EMAIL` ili `ADMIN_EMAIL`
- [ ] `SMTP_ENABLED=true` + `SMTP_*` + `EMAIL_FROM` **ili** `COMMS_URL` + `COMMS_KEY`
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` (min 32 znaka, random na prod)
- [ ] `APP_URL` = javni URL Atina API-ja

### `apps/omnigroup-web/.env.local`

- [ ] `NEXT_PUBLIC_ATINA_API_BASE` = Atina URL
- [ ] `SESSION_SECRET` (min 32 znaka)
- [ ] `RESEND_API_KEY` + `CONTACT_EMAIL_*` (kontakt forma)
- [ ] `NEXT_PUBLIC_SITE_URL` (staging/prod domen)

Provera: `.\scripts\check-atina-aggregators.ps1`

## 3. Billing tok (E2E)

1. Klijent: dashboard → checkout → email proforma
2. Klijent: „Poslao sam uplatu“
3. Admin: `/admin` → Uplate na čekanju → Potvrdi
4. Klijent: email faktura + aktivan plan

Pregled faktura: `/invoices/preview`

## 4. Deploy staging

- [ ] Atina Docker / Node na hostu (:3000)
- [ ] Web Next.js (:3010 ili reverse proxy)
- [ ] Postgres + Redis
- [ ] `npm run smoke:all` na staging Atina URL
- [ ] Smoke web sa staging URL-om

Vidi: [`STAGING-RELEASE-CHECKLIST.md`](STAGING-RELEASE-CHECKLIST.md)

## 5. Produkcija (CEO A–H)

- [ ] GitHub branch protection + zelen CI
- [ ] Nest `TYPEORM_SYNC=false` + migracije
- [ ] Prod `.env` bez default tajni
- [ ] TLS / DNS
- [ ] Smoke na prod URL
- [ ] Evidencije Pass: `GIT-A`, `TYPEORM-PROD`, `CEO-G`

Vidi: [`VLASNIK-PAKET.md`](VLASNIK-PAKET.md)

## 6. Posle launch-a (isti repo)

- [ ] Stripe live (kad bude firma)
- [ ] Kriptoman / PayPal / Wise ključevi
- [ ] PDF attachment uz fakturu
- [ ] K8s / swarm moduli (`infra/`, Faza 6)

## 1) Remaining `[ ]` items (A, C, G, I)

**A (1)**
- Git repozitorijum: `main` zaštićen, PR obavezni

**C (1)**
- Produkcija: `TYPEORM_SYNC=false` + migracije na prod bazi (Nest)

**G (8)** — `test:ci` is already `[x]`
- `npm run build` u produkciji
- Migracije pregledane na stagingu
- `.env` produkcija (tajne, `NODE_ENV=production`, `DB_SSL`)
- Stripe / PayPal / Wise **live** + webhook secreti
- SMTP proveren (Atina, ne Resend kontakt)
- Smoke: `npm run smoke:all` na prod URL
- Admin monitoring: `/admin/overview`, execution-stats
- Vlasnik rollback-a + uslovi

**I (6)**
- GitHub prv push (`remote` + push `main`)
- Disk C: ≥5 GB
- Resend kontakt (D.2)
- Atina agregatori + Stripe (7 agregatora + price IDs)
- Staging deploy (web + Atina)
- (Opciono) Atina SMTP staging (D.5)

---

## 2) Effectively done live — checklist stale

| Item | Live evidence |
|------|----------------|
| **I — GitHub prv push** | Repo on GitHub; CI Run [#214](https://github.com/Marko200322/omni-group/actions/runs/26978285738) green |
| **I — Resend kontakt** | ADMIN 2026-08-04: `sent_via_resend` + CRM |
| **I — Staging deploy** | Prod live: `omnigrouptech.com` + `api.omnigrouptech.com`, health/admin OK, 850/850 fulfillment |
| **I — Atina agregatori** | M4 keys imported (OpenRouter, Hunter, scraper, etc.); **Stripe still EMPTY** |
| **G — prod build** | Atina deployed on VPS; no CEO-G sign-off row |
| **G — prod `.env`** | App boots, admin login OK; no formal Pass in `CEO-G-PRODUCTION-EVIDENCE-LATEST.md` |
| **G — smoke / admin** | Health + admin login + fulfillment matrix PASS; formal `smoke:all` + admin route sign-off missing |
| **G — migracije** | `atina_saas_db` live + backup/restore drill (56 tables); no staging review / CEO-G row |

**Not stale — genuinely open:** A (branch protection), C (Nest not in live Docker stack), G (Stripe live, Atina SMTP, rollback ownership, evidence blanks), I (Disk C, Stripe, optional SMTP).

---

## 3) Ordered fix list

### TI (owner)
1. **`gh auth login`** → say „ulogovan“ (blocks A + JA branch protection)
2. **Stripe live** keys + price IDs → `deploy.config` (blocks G #5, I agregatori/Stripe, M6)
3. **Rollback owner** name + contact + thresholds (G #8) — write privately, not in repo
4. **Firma / PIB / adresa** in `deploy.config` (invoice/legal; parallel to G)
5. **Disk C** cleanup if `verify-monorepo` still hits ENOSPC (I) — gate includes **`Python (Doslednost dok + pytest)`** ([`GIT-BRANCH-PROTECTION.md`](../../GIT-BRANCH-PROTECTION.md))
6. *(Optional)* Atina SMTP relay or mark N/A if Resend-only (G #6, I D.5)

### JA (agent)
1. **Branch protection** on `main` + 5 required checks after `gh auth` (A) → fill `GIT-A-EVIDENCE-LATEST.md`
2. **Prod CEO-G evidence run:** `npm run smoke:all` on `https://api.omnigrouptech.com`, admin routes, populate `CEO-G-PRODUCTION-EVIDENCE-LATEST.md` (G #1,3,4,7,8 where Pass)
3. **Mark stale `[x]`** in checklist: I push, Resend, staging/prod deploy, partial agregatori
4. **CEO C:** document Nest as **N/A until Nest in prod stack**, or run TypeORM gate when Nest is added (C)
5. **Stripe wiring** in deploy once TI provides keys (G #5)
6. **Rollback doc** tie-in to `VPS-BACKUP-EVIDENCE-LATEST.md` (G #8)

**Critical path:** TI #1 → JA #1 (A) → JA #2 + TI #2 (G sign-off + Stripe) → C deferred until Nest prod deploy.

[REDACTED]

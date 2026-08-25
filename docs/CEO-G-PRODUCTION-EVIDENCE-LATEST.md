# Evidencija — CEO sekcija G (Atina SaaS produkcioni gate)

**Poslednji pregled (2026-08-04, gap-scan):** lokalni preduslov PASS · **prod `smoke:all` PASS** na `https://api.omnigrouptech.com` · ostale CEO-G stavke još otvorene / N/A.

**Status:** _delimičan prod sign-off — smoke + admin monitoring PASS; Stripe/SMTP/staging/rollback owner još otvoreno_

**Glavni runbook:** [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md)  
**Staging:** [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md)  
**Rollback:** [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)  
**Šablon:** [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md)

---

## Sign-off blok (2026-08-04)

**Datum:** 2026-08-04  
**Okruženje:** `https://api.omnigrouptech.com` · web `https://omnigrouptech.com`  
**Release:** live VPS (web + atina-api); CI Run [#214](https://github.com/Marko200322/omni-group/actions/runs/26978285738)

| # | Stavka | PASS / FAIL / N/A | Napomena |
|---|--------|-------------------|----------|
| 1 | `npm run build` u prod CI/serveru | PASS | Live boot + monorepo CI build green |
| 2 | `npm run test:ci` (N1) | N/A | Zatvoreno u N1 / CI |
| 3 | Migracije na stagingu | N/A | Nema staging VPS (ADMIN #9); live Atina Node + backup drill PASS |
| 4 | `.env` produkcija | PASS | Boot OK, admin login OK, `environment=production` |
| 5 | Stripe / PayPal / Wise live | open | Stripe EMPTY — IBAN M4; kartice = REDOM #4 |
| 6 | SMTP (invoice PDF) | N/A / open | Kontakt Resend PASS; PDF path = Atina SMTP/COMMS (REDOM #3b) |
| 7 | `npm run smoke:all` na prod | **PASS** | health, login, `/me`, forge, workflow-template, forge-admin |
| 8 | Admin overview + execution-stats | **PASS** | forge-admin smoke (`overviewOk`, `executionStatsOk`) |
| 9 | Rollback owner + uslovi | open | TI: ime + thresholds; PG restore drill PASS |

**Ukupno:** Partial Pass — smoke/admin/env OK; kartice + rollback owner + invoice SMTP još fale.

**Napomena:** lokalni `ADMIN-CREDENTIALS.local.txt` nije u syncu sa VPS `deploy.config` — smoke mora kredencijale iz deploy.config (ne commitovati).

---

## Preostali koraci (TI / JA)

1. **TI:** Stripe live + price IDs kad kartice (REDOM #4) → zatvara G#5  
2. **TI:** Rollback owner ime/kontakt (privatno) + thresholds → G#9  
3. **TI+JA:** Atina SMTP ili COMMS attachment za invoice PDF → G#6 / REDOM #3b  
4. **TI:** Staging VPS odluka → inače G#3 ostaje N/A  

Detaljan runbook (koraci 1–8) i dalje važi u starijim verzijama / template-u. Prod smoke komanda:

```powershell
Set-Location atina-platform\atina
npm run smoke:all -- -BaseUrl "https://api.omnigrouptech.com" -Email "<admin>" -Password "<iz-deploy.config>"
```

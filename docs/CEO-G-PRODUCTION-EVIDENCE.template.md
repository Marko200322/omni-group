# Evidencija — CEO sekcija G (Atina SaaS produkcioni gate)

*(Jedan dokument za sign-off pre „zelenog“ **u CEO sekciji G** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md). Bez API ključeva u javnom tekstu.)*

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

**Datum:** _(YYYY-MM-DD)_  
**Vlasnik release-a:** _(ime)_  
**Okruženje:** produkcija / staging (navedi URL-ove ako politika dozvoljava)

| Stavka (CEO sekcija G) | PASS / N/A | Napomena (kratko) |
|-------------|------------|-------------------|
| `npm run build` u produkciji | | |
| `npm run test:ci` u CI (već N1) | | _(obično već `[x]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md))_ |
| Migracije pregledane na stagingu | | |
| `.env` produkcija (tajne, `NODE_ENV=production`, `DB_SSL`) | | |
| Stripe / PayPal / Wise live + webhook | | |
| SMTP (ako je obavezno) | | |
| Smoke: `npm run smoke:all` (`/health`, auth/me, forge/status, execution-stats, forge-admin) | | |
| Admin: `GET /api/v1/admin/overview`, execution-stats | | |
| Vlasnik rollback-a + uslovi | | |

**Ukupno:** Pass / Fail — _(jedna rečenica)_

**Runbook-i:** [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) · [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)

# Master sekvenca **04** — produkcijski cutover (CEO A / C / G)

**Prethodno:** [`MASTER-SEQUENCE-03-STAGING-LIVE.md`](./MASTER-SEQUENCE-03-STAGING-LIVE.md) · **Sledeće:** [`MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md`](./MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md)  
**Hub:** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md)

## Cilj

Zatvoriti **preostale** `- [ ]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) koje zahtevaju **host, nalog ili novac** — mapa: [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md).

## Checklist (vlasnik)

- [ ] **CEO sekcija A — Git:** `main` zaštićen, PR obavezni — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) → [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) **Pass** → `[x]` u CEO listi.
- [ ] **CEO sekcija C — Nest prod:** `TYPEORM_SYNC=false` + migracije na prod DB — [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) → [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) **Pass** → `[x]` u CEO listi.
- [ ] **CEO sekcija G — Node SaaS:** redom: prod `npm run build`, staging migracije pregledane, prod `.env`, live Stripe/PayPal/Wise + webhooki, SMTP, `npm run smoke:all` na **pravom** URL-u, admin overview + execution-stats, rollback vlasnik — [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) **Pass** → svi `[x]` u **CEO sekciji G**.

## Dokaz

- Tri fajla evidencije **Pass** + ažuriran [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) + red u [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) ako treba.

## Veze

- [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) · [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)

---

*Lista 04 — prod cutover.*

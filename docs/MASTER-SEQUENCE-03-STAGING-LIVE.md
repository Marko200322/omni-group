# Master sekvenca **03** — staging živ (stack + smoke)

**Prethodno:** [`MASTER-SEQUENCE-02-GATE-GREEN.md`](./MASTER-SEQUENCE-02-GATE-GREEN.md) · **Sledeće:** [`MASTER-SEQUENCE-04-PROD-CUTOVER.md`](./MASTER-SEQUENCE-04-PROD-CUTOVER.md)  
**Hub:** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md)

## Cilj

**Staging** okruženje koje ponaša produkciju: isti compose redosled, migracije, tajne po šablonu, HTTP smoke pre merge-a na `main`.

## Checklist

- [ ] **Staging DB / Redis** po [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) i [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md).
- [ ] **Atina Node:** `db:up` → `migrate` → `seed` (ako treba) → `dev` ili compose — [`atina-platform/atina/README.md`](../atina-platform/atina/README.md).
- [ ] **Nest:** compose iz korena (`docker-compose.atina.yml` + merge portova) ili lokalno — [`SYSTEM-MAP.md`](../SYSTEM-MAP.md).
- [ ] **Python Astra** (ako u staging matrici): root `docker compose` — [`PYTHON-ASTRA-OPS.md`](./PYTHON-ASTRA-OPS.md).
- [ ] **Smoke tri-stub:** [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) — Atina Node stub = **GET** `/health` ([`scripts/README.md`](../scripts/README.md)).
- [ ] **Bundled Atina HTTP:** `npm run smoke:all` u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).
- [ ] **Webhook / SMTP staging** (ako plaćanja ili mail): [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md) · [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md).
- [ ] Popuni [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md) ili sopstveni log — vodi [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (monorepo evidencija indeks + dry-run par).

## Dokaz

- URL staginga + datum u logu; **LATEST smoke** (**sekcija H**) u [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) ako je ista matrica kao lokalno.

## Veze

- [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (red #17)

---

*Lista 03 — staging živ.*

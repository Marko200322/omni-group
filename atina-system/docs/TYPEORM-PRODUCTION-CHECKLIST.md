# TypeORM — production gate / stavke (CEO sekcija C)

**CEO sekcija C (repo):** real production ships with **`TYPEORM_SYNC=false`** and **migrations applied** to the production database (not `synchronize`). Repo context: [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md) — **CEO sekcija C**; implementation detail: [`MIGRATIONS-PLAN.md`](./MIGRATIONS-PLAN.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../../apps/omnigroup-web/README.md).

---

## Environment (production)

| Variable | Production value | Notes |
|----------|------------------|--------|
| `TYPEORM_SYNC` | **`false`** | Must be the string `false`; any other value leaves auto-sync behavior on for this service. |
| `NODE_ENV` | `production` | As required by your deploy. |
| `POSTGRES_HOST` | _(set)_ | Same DB you run migrations against. |
| `POSTGRES_PORT` | _(set)_ | |
| `POSTGRES_USER` | _(set)_ | |
| `POSTGRES_PASSWORD` | _(secret)_ | |
| `POSTGRES_DB` | _(set)_ | |
| `POSTGRES_SSL` | `true` when DB requires TLS | Nest + TypeORM CLI (`data-source.ts`) share [`postgres-ssl.util.ts`](../src/database/postgres-ssl.util.ts): off unless `true`/`1`. Local Docker: `false`. |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | `true` (typical) | Set to `false` only if you accept MITM risk (some managed DBs / dev tunnels). |
| `TYPEORM_LOG` | `false` (typical) | Optional; enable briefly for incident debug only. |

See [`../.env.example`](../.env.example) for the full template.

---

## Ordered steps (every release)

1. **Review** — Merge migration PRs; read `up()` SQL; confirm no reliance on `synchronize` for schema changes.
2. **Backup** — Take a production DB backup/snapshot in the agreed migration window (see [`../../atina-platform/atina/docs/operations/db-backup-restore-runbook.md`](../../atina-platform/atina/docs/operations/db-backup-restore-runbook.md)).
3. **Migrate before app** — From the **release** tree: `npm run build` then `npm run migration:run` against production credentials **before** (or as part of the same deploy phase as) serving traffic with code that requires the new schema.
4. **Set env** — Deploy/update secrets so **`TYPEORM_SYNC=false`**, `POSTGRES_*`, and (if the DB uses TLS) **`POSTGRES_SSL=true`** match the migrated database.
5. **Deploy application** — Roll out the new image/process with that env.
6. **Verify** — Health/smoke; confirm expected revision in TypeORM’s migrations table and critical paths.
7. **If something fails** — **Rollback / incident:** follow **[`../../atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../../atina-platform/atina/docs/operations/deploy-rollback-checklist.md)** (owners, triggers, ordering). Database undo: only via a **tested** path — **`migration:revert`** where safe, or restore from backup — see **[`../../atina-platform/atina/docs/operations/db-rollback-drill-runbook.md`](../../atina-platform/atina/docs/operations/db-rollback-drill-runbook.md)** and the backup runbook above.

---

## Never in production

- `TYPEORM_SYNC=true`
- Deploying a build that expects new tables/columns **without** having run the matching migrations first

---

## Evidencija za CEO sekciju C (šablon)

Kad zatvaraš stavku *„Produkcija: `TYPEORM_SYNC=false` + migracije na prod DB“* u [`CHECKLIST-CEO-SISTEM.md`](../../CHECKLIST-CEO-SISTEM.md), zalepi kratak zapis (datum, vlasnik, potvrda migracija + `TYPEORM_SYNC=false` u deploy env) u novi fajl npr. `docs/TYPEORM-C-EVIDENCE-LATEST.md` **ili** kao sekciju u internom release logu.

Za staging evidenciju koristi šablon [`STAGING-EXECUTION-LOG.template.md`](../../docs/STAGING-EXECUTION-LOG.template.md).

**Minimalni blok:**

- **Datum:** …  
- **DB / okruženje:** … (bez lozinki)  
- **`TYPEORM_SYNC` u prod:** `false` (potvrđeno)  
- **Migracije:** poslednja primenjena migracija / revizija …  
- **Pass / Fail:** …

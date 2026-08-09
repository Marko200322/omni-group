# VPS Postgres backup — evidencija (2026-08-04)

**Host:** `5.189.184.103` · **DB container:** `omni-group-postgres-1` · **DB:** `atina_saas_db` / `atina_user`

## Šta je urađeno
- Skripta: `/opt/omni-group/scripts/vps-atina-pg-backup.sh`
- Dump dir: `/opt/omni-group/backups/postgres/`
- Cron: `15 3 * * *` (svaki dan 03:15), retention **14 dana**
- Prvi dump: `atina-atina_saas_db-20260804-210520.dump` (~2.2 MB) + `.sha256`

## Restore drill (bez overwrite prod-a)
- Kreirana privremena DB `atina_restore_drill`
- `pg_restore` → **56** public tabela, **1206** redova u `payments`
- Temp DB obrisana posle provere

**Status:** PASS — REDOM #2 zatvoren.

# Rollback owner (verified 2026-09-06)

- **Owner:** Marko Kosic (`markokosic020@gmail.com`)
- **Condition:** failed deploy smoke / data corruption / security incident
- **Runbook:** `atina-platform/atina/docs/operations/deploy-rollback-checklist.md`
- **Start:** redeploy last known-good via `.\scripts\deploy-from-local-secrets.ps1 -SafeDeploy`
- **Evidence pointer:** this file closes ADMIN / factory closeout “rollback owner” TI item

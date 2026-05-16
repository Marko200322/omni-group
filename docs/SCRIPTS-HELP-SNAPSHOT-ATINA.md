# `Get-Help` snapshot - `atina-platform/atina/scripts`

**Generisan:** 2026-05-14 05:42 | **Skripta za regen:** `../scripts/regenerate-help-snapshot.ps1` | **Broj skripti:** 8

**Refs:**

- **Pun verify (CI mirror):** `../scripts/verify-monorepo.ps1` (job `python` / required check `Python (Doslednost dok + pytest)` - `../docs/GIT-BRANCH-PROTECTION.md`; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb)
- **Smoke (HTTP):** `../scripts/smoke-stack.ps1` + bundled Atina `npm run smoke:all` (formalni Atina release gate: `../atina-platform/atina/docs/operations/release-gate-checklist.md` - *Local notes - Smoke tests*)
- **Single entry point za read-only audit suite:** `../scripts/run-all-audits.ps1` - pokrece audit-doc-gate-references + check-doc-links + check-dev-docs-coverage + scan-todo-markers + audit-npm-monorepo (svih 5 read-only audit-a iz 1 poziva)
- **Vlasnik dashboard:** `../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`
- **Monorepo evidencija (indeks + dry-run):** `../docs/EVIDENCE-INDEX.md` / `../docs/NIVO-1-DRYRUN-LOG.md`

> **Svrha dokumenta:** staticka jednostranicna referenca za sve PowerShell skripte u `atina-platform/atina/scripts/`. Vlasnik moze pregledati synopsis, sintaksu, parametre i primere bez pokretanja terminala. Pun Get-Help izlaz dobija sa komandom uz svaki red ispod (npr. Get-Help .\scripts\verify-monorepo.ps1 -Full). **Regen pri svakoj izmeni comment-based help-a u bilo kojoj skripti** - pokreni `../scripts/regenerate-help-snapshot.ps1` (read-only, smoke test rezultat na kraju).

---

## `free-port.ps1`

**Putanja:** `../atina-platform/atina/scripts/free-port.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `free-port.ps1 [[-Port] <int>] [-DryRun]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\free-port.ps1 -Full`

---

## `smoke-all.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-all.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-all.ps1 [[-BaseUrl] <string>] [[-Email] <string>] [[-Password] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-all.ps1 -Full`

---

## `smoke-atina-forge-workflow-template.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-atina-forge-workflow-template.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-atina-forge-workflow-template.ps1 [[-BaseUrl] <string>] [[-Email] <string>] [[-Password] <string>] [[-AccessToken] <string>] [[-Days] <int>] [[-TemplateKey] <string>] [-RequireTemplateKey]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-atina-forge-workflow-template.ps1 -Full`

---

## `smoke-auth.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-auth.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-auth.ps1 [[-BaseUrl] <string>] [[-Email] <string>] [[-Password] <string>] [[-AccessToken] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-auth.ps1 -Full`

---

## `smoke-forge-admin.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-forge-admin.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-forge-admin.ps1 [[-BaseUrl] <string>] [[-Email] <string>] [[-Password] <string>] [[-ExecutionStatsDays] <int>] [[-AccessToken] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-forge-admin.ps1 -Full`

---

## `smoke-forge-status.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-forge-status.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-forge-status.ps1 [[-BaseUrl] <string>] [[-Email] <string>] [[-Password] <string>] [[-AccessToken] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-forge-status.ps1 -Full`

---

## `smoke-health.ps1`

**Putanja:** `../atina-platform/atina/scripts/smoke-health.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `smoke-health.ps1 [[-BaseUrl] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\smoke-health.ps1 -Full`

---

## `vault-db-ops.ps1`

**Putanja:** `../atina-platform/atina/scripts/vault-db-ops.ps1`

**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** `vault-db-ops.ps1 [[-Action] <string>] [[-VaultPath] <string>] [[-BackupDir] <string>] [[-RetentionDays] <int>] [[-KeepLast] <int>] [[-SourceFile] <string>]`

**Pun help za vlasnika:** `Get-Help .\atina-platform\atina\scripts\vault-db-ops.ps1 -Full`

---

## Smoke test rezime

| Provera | Rezultat |
|---------|----------|
| Skripti ukupno | **8** |
| Sa `.SYNOPSIS` | **0** / 8 |
| Sa `.DESCRIPTION` | **0** / 8 |
| Sa bar 1 `.EXAMPLE` | **0** / 8 |
| Sa `.NOTES` | **0** / 8 |
| `Get-Help` greske | **0** / 8 |

### Reprodukcija

Iz korena repoa: `powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\regenerate-help-snapshot.ps1`

Pre-PR gate-flavor (non-zero exit ako bilo koja skripta nema `.SYNOPSIS` ili `Get-Help` padne): dodaj `-FailOnError`.


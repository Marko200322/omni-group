# A9 Infrastructure — [Infrastructure](fef72a72-c20c-4eb7-b90e-cd4ddede472d)

**Verdict: CONDITIONALLY READY**

## Aligned
- Caddy routing for omnigrouptech.com / api.omnigrouptech.com
- Compose build-arg defaults to live HTTPS URLs
- prepare-vps-prod + deploy domain guard
- Backup/restore-drill + keep-warm cron (full deploy path)
- Internal localhost healthchecks / ATINA_API_BASE docker DNS = expected

## Gaps
- Caddy on `tls` profile; plain `up` has no HTTPS
- SafeDeploy recreates only web/atina-api — does not ensure Caddy
- Compose SITE_DOMAIN/API_DOMAIN default localhost if env missing
- Backups local VPS only (no off-site)
- No separate queue worker (schedulers in atina-api)
- Live-avatar stub defaults; many integrations optional

## Classification
READY for core marketing+API when Caddy/TLS/env correct.
CONDITIONALLY READY overall due to SafeDeploy/Caddy footgun, local-only backups, optional integrations.
NOT READY if compose without tls profile or missing domains on fresh host.

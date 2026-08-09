# VPS infra/ops audit — live product gaps

**Baseline (confirmed done):** `5.189.184.103` · `omnigrouptech.com` / `api.` · Docker stack (web, atina-api, postgres, redis, Caddy TLS) · DNS api · Resend contact · PG cron backup + restore drill ([`docs/VPS-BACKUP-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\VPS-BACKUP-EVIDENCE-LATEST.md)) · fulfillment **850/850**.

**Doc truth:** [`docs/ADMIN-JEDNA-LISTA.md`](C:\dev\omni group\docs\ADMIN-JEDNA-LISTA.md) · [`docs/VLASNIK-DOSTAVA.md`](C:\dev\omni group\docs\VLASNIK-DOSTAVA.md) §4 · [`docs/STAGING-MIRROR-PROD.md`](C:\dev\omni group\docs\STAGING-MIRROR-PROD.md) §6 · [`docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\CEO-G-PRODUCTION-EVIDENCE-LATEST.md).

---

## Ordered backlog — TI (vlasnik / paneli)

| # | Stavka | Status | Dok / akcija |
|---|--------|--------|--------------|
| 1 | **GitHub branch protection** na `main` | Open — `gh auth login` | [`docs/GIT-BRANCH-PROTECTION.md`](C:\dev\omni group\docs\GIT-BRANCH-PROTECTION.md) · [`docs/GIT-A-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\GIT-A-EVIDENCE-LATEST.md) |
| 2 | **Odluka: staging VPS** (da/ne + IP/budget) | Open — nema staging hosta | [`docs/VLASNIK-DOSTAVA.md`](C:\dev\omni group\docs\VLASNIK-DOSTAVA.md) §4 · [`docs/STAGING-MIRROR-PROD.md`](C:\dev\omni group\docs\STAGING-MIRROR-PROD.md) §6 |
| 3 | **Odluka: offsite backup** (Contabo snapshot / S3 / drugo) | Open — samo lokalni PG dump na VPS | [`docs/VLASNIK-DOSTAVA.md`](C:\dev\omni group\docs\VLASNIK-DOSTAVA.md) §4 „Backup kod providera?“ |
| 4 | **Odluka: uptime monitoring** (Better Stack / UptimeRobot / preskoči) | Open — nema eksternog monitora | [`docs/VLASNIK-DOSTAVA.md`](C:\dev\omni group\docs\VLASNIK-DOSTAVA.md) §4 |
| 5 | **Odluka: CDN** (Cloudflare proxy / preskoči) | Open — direktan Caddy→VPS, bez CDN | [`infra/caddy/Caddyfile`](C:\dev\omni group\infra\caddy\Caddyfile) · ADMIN #9 backlog |
| 6 | **Secrets backup** — enkriptovana kopija `deploy-secrets.local/deploy.config.json` + `KLJUCEVI-POPUNI.local.txt` van mašine | **Nema runbooka** — samo „ne commituj“ | [`docs/KLJUCEVI-JEDAN-IZVOR.md`](C:\dev\omni group\docs\KLJUCEVI-JEDAN-IZVOR.md) |
| 7 | **Rollback owner** (primary + backup, kontakt) | Open — CEO-G Korak 8 prazan | [`docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\CEO-G-PRODUCTION-EVIDENCE-LATEST.md) |
| 8 | **SSH ključ** umesto lozinke na VPS | Preporuka, ne urađeno | `sshKeyPath` u deploy.config · [`docs/SYSTEM-INTEGRATION-CHECKLIST.md`](C:\dev\omni group\docs\SYSTEM-INTEGRATION-CHECKLIST.md) |
| 9 | **Firma / PIB / adresa** na fakturi | Open | ADMIN REDOM #3 |
| 10 | **Stripe live** (kad kartice) | Open | ADMIN REDOM #4 |
| 11 | **2FA za admin** | Open — **nema implementacije u kodu** | Samo ADMIN #9 opcioni backlog; nema TOTP/2FA u auth modulu |
| 12 | Resend SPF/DKIM re-verify u UI | Opciono potvrdi | ADMIN Blok 1A |

---

## Ordered backlog — JA (agent / deploy / evidencija)

| # | Stavka | Status | Dok / akcija |
|---|--------|--------|--------------|
| 1 | **CEO-G prod sign-off** (8 stavki) — `smoke:all` na **live** URL, admin overview, `.env` audit | Open — lokalno PASS, prod tabela prazna | [`docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\CEO-G-PRODUCTION-EVIDENCE-LATEST.md) |
| 2 | **Branch protection** posle TI `gh auth login` | Čeka TI | `scripts/branch-protection-ready.ps1` |
| 3 | **Rollback drill evidencija** — restore iz PG dumpa + redeploy prethodnog image taga | Runbook postoji, **nema prod drill evidence**; nema `scripts/*rollback*` | [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](C:\dev\omni group\atina-platform\atina\docs\operations\deploy-rollback-checklist.md) · [`db-rollback-drill-runbook.md`](C:\dev\omni group\atina-platform\atina\docs\operations\db-rollback-drill-runbook.md) |
| 4 | **Offsite PG backup sync** (posle TI odluke #3) | Nije implementirano | Proširiti `/opt/omni-group/scripts/vps-atina-pg-backup.sh` ili cron→S3 |
| 5 | **Staging deploy** (posle TI odluke #2) | Runbooki spremni, host ne postoji | [`docs/STAGING-RELEASE-CHECKLIST.md`](C:\dev\omni group\docs\STAGING-RELEASE-CHECKLIST.md) · `scripts/staging-smoke-remote.ps1` · [`docs/STAGING-LOCAL-PREFLIGHT-LATEST.md`](C:\dev\omni group\docs\STAGING-LOCAL-PREFLIGHT-LATEST.md) |
| 6 | **Uptime checks** (posle TI nalog #4) | Samo in-app `/health` + admin policy | [`docs/OBSERVABILITY-RUNBOOK.md`](C:\dev\omni group\docs\OBSERVABILITY-RUNBOOK.md) · [`monitoring-alert-channel-policy.md`](C:\dev\omni group\atina-platform\atina\docs\operations\monitoring-alert-channel-policy.md) (Slack/Pager — nije live) |
| 7 | **CDN wiring** (posle TI odluke #5) | Caddy ostaje origin | Cloudflare DNS + proxy + real-IP u Caddy |
| 8 | **Deploy scripts — poznati gapovi** | Skripte rade; nedostaje rollback automation + upload volume | `deploy-from-local-secrets.ps1` · `deploy-to-vps.ps1` · [`docs/SYSTEM-INTEGRATION-CHECKLIST.md`](C:\dev\omni group\docs\SYSTEM-INTEGRATION-CHECKLIST.md) „Upload persistent storage“ |
| 9 | **Nest TypeORM prod** | Nest **nije** u live Docker stacku | ADMIN REDOM #5 · [`docs/TYPEORM-PROD-EVIDENCE-LATEST.md`](C:\dev\omni group\docs\TYPEORM-PROD-EVIDENCE-LATEST.md) |
| 10 | **2FA implementacija** (posle TI prioriteta) | Zero code — design doc ne pokriva 2FA | Potreban auth modul + admin UI |
| 11 | **Secrets backup runbook** | **Gap u docs** — nema procedure | Treba 1-stranica: encrypt + offline store + rotate cadence |

---

## Area-by-area snapshot

| Area | Done | Gap |
|------|------|-----|
| **Staging** | Checklisti, mirror-prod, local preflight PASS | Nema staging VPS; §1–§4 nikad izvršeni na hostu |
| **Uptime** | `/health`, admin `/api/v1/admin/health` | Nema Better Stack/UptimeRobot; alert pipeline (Slack/Pager) neaktivan |
| **CDN** | Caddy TLS termination | Nema Cloudflare/WAF/cache; CDN samo u deliverable tekstu |
| **2FA** | — | Nema u kodu ni runbooku |
| **Rollback** | Runbooki + PG backup | Nema VPS rollback skripte; CEO-G owner/triggers prazni; rollback drill neevidentiran |
| **Deploy scripts** | `deploy-from-local-secrets.ps1`, `deploy-to-vps.ps1`, `pre-deploy-gate.ps1` | Nema rollback; upload volume; K8s skripte su Faza 6, ne live VPS |
| **Secrets backup** | Gitignore + 2 lokalna fajla | Nema offsite/encrypted backup procedure |
| **PG backup** | Cron 03:15, 14d retention, restore drill PASS | Samo on-box; offsite odluka otvorena |

---

## Preporučeni red (paralelno gde može)

1. **TI:** `gh auth login` → **JA:** branch protection  
2. **JA:** `npm run smoke:all` na `https://api.omnigrouptech.com` + popuni CEO-G  
3. **TI:** rollback owner + offsite backup odluka + secrets encrypted copy  
4. **JA:** rollback drill evidence + (opciono) offsite sync  
5. **TI:** staging da/ne + uptime nalog → **JA:** deploy/monitor  
6. **TI+JA:** CDN / 2FA / Nest — opcioni backlog (ADMIN #9)

**Blokatori pre „enterprise green“:** #1 branch protection, CEO-G prod smoke, rollback owner + drill, offsite/secrets backup odluka. Staging nije hard blocker za IBAN/manual pay, ali jeste pre sigurnog release cadence-a sa migracijama.

[REDACTED]

# Staging - lokalni preduslov (pre deploya na URL)

**Datum:** 2026-06-04  
**Commit za deploy:** [d5a7f09](https://github.com/Marko200322/omni-group/commit/d5a7f09df07a32f64ffb5376d6b7807b88b2ea59)  
**CI:** Run [#171](https://github.com/Marko200322/omni-group/actions/runs/26939601776) - **5/5 PASS**

**Status:** _lokalno spremno; remote staging deploy ceka vlasnika_

Kopiraj relevantne redove u [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md) posle deploya na staging host.

---

## Lokalno zatvoreno (agent)

| Gate | Rezultat | Napomena |
|------|----------|----------|
| GitHub CI (monorepo) | **PASS** | poslednji run #171 |
| branch-protection-ready.ps1 | **PASS** | spremno za GitHub Settings |
| staging-smoke-remote.ps1 (127.0.0.1:3000) | **PASS** | /health + smoke:all |
| owner-gates-quick.ps1 | **PASS** | CI + smoke + doc gate bundle |
| owner-daily.ps1 | **PASS** | status + CI + web/Atina smoke (auto) |
| owner-smoke-all.ps1 | **PASS** | ranije na istom commit-u |
| Atina :3000 / Web :3010 | **down / 200** | health probe |

**Disk C:** ~2.31 GB

---

## Vlasnik - posle deploya na staging URL

1. Deploy **d5a7f09** (Atina + web + Nest po [STAGING-RELEASE-CHECKLIST.md](./STAGING-RELEASE-CHECKLIST.md))
2. **Backup DB** - npm run migrate na staging
3. Remote smoke:

```powershell
$env:STAGING_ATINA_NODE_BASE='https://<STAGING_HOST>'
.\scripts\staging-smoke-remote.ps1
```

4. Popuni [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md)
5. Upis u [CEO-G-PRODUCTION-EVIDENCE-LATEST.md](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)

**Brzi pregled:** [staging-owner-next.ps1](../scripts/staging-owner-next.ps1) | [owner-daily.ps1](../scripts/owner-daily.ps1) | [owner-gates-quick.ps1](../scripts/owner-gates-quick.ps1) | [refresh-staging-handoff.ps1](../scripts/refresh-staging-handoff.ps1)

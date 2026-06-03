# Staging - lokalni preduslov (pre deploya na URL)

**Datum:** 2026-06-04  
**Commit za deploy:** [9b99d56](https://github.com/Marko200322/omni-group/commit/9b99d56676d0a05ead62c4a580fae78b79e20173)  
**CI:** Run [#89](https://github.com/Marko200322/omni-group/actions/runs/26917439481) - **5/5 PASS**

**Status:** _lokalno spremno; remote staging deploy ceka vlasnika_

Kopiraj relevantne redove u [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md) posle deploya na staging host.

---

## Lokalno zatvoreno (agent)

| Gate | Rezultat | Napomena |
|------|----------|----------|
| GitHub CI (monorepo) | **PASS** | poslednji run #89 |
| branch-protection-ready.ps1 | **PASS** | spremno za GitHub Settings |
| staging-smoke-remote.ps1 (127.0.0.1:3000) | **PASS** | /health + smoke:all |
| owner-smoke-all.ps1 | **PASS** | ranije na istom commit-u |
| Atina :3000 / Web :3010 | **ok / 200** | health probe |

**Disk C:** ~0.8 GB - ispod 1 GB; staging-preflight koristi `-MinDiskGb 1`

---

## Vlasnik - posle deploya na staging URL

1. Deploy **9b99d56** (Atina + web + Nest po [STAGING-RELEASE-CHECKLIST.md](./STAGING-RELEASE-CHECKLIST.md))
2. **Backup DB** - npm run migrate na staging
3. Remote smoke:

```powershell
$env:STAGING_ATINA_NODE_BASE='https://<STAGING_HOST>'
.\scripts\staging-smoke-remote.ps1
```

4. Popuni [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md)
5. Upis u [CEO-G-PRODUCTION-EVIDENCE-LATEST.md](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)

**Brzi pregled:** [staging-owner-next.ps1](../scripts/staging-owner-next.ps1) | [refresh-staging-handoff.ps1](../scripts/refresh-staging-handoff.ps1)

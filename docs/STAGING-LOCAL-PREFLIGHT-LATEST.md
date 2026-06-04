# Staging - lokalni preduslov (pre deploya na URL)

**Datum:** 2026-06-04  
**Commit za deploy:** [4eba525](https://github.com/Marko200322/omni-group/commit/4eba525f5504fbe2b3065478121ac4f3ed8080d2)  
**CI:** _(CI run nije ucitan)_

**Status:** _lokalno spremno; remote staging deploy ceka vlasnika_

Kopiraj relevantne redove u [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md) posle deploya na staging host.

---

## Lokalno zatvoreno (agent)

| Gate | Rezultat | Napomena |
|------|----------|----------|
| GitHub CI (monorepo) | **PASS** | poslednji run #77+ |
| branch-protection-ready.ps1 | **PASS** | spremno za GitHub Settings |
| staging-smoke-remote.ps1 (127.0.0.1:3000) | **PASS** | /health + smoke:all |
| owner-gates-quick.ps1 | **PASS** | CI + smoke + doc gate bundle |
| owner-smoke-all.ps1 | **PASS** | ranije na istom commit-u |
| Atina :3000 / Web :3010 | **ok / 200** | health probe |

**Disk C:** ~0 GB - ispod 1 GB; staging-preflight: `-SkipAtinaTestCi -SkipDiskCheck` (posle owner-smoke-all)

---

## Vlasnik - posle deploya na staging URL

1. Deploy **4eba525** (Atina + web + Nest po [STAGING-RELEASE-CHECKLIST.md](./STAGING-RELEASE-CHECKLIST.md))
2. **Backup DB** - npm run migrate na staging
3. Remote smoke:

```powershell
$env:STAGING_ATINA_NODE_BASE='https://<STAGING_HOST>'
.\scripts\staging-smoke-remote.ps1
```

4. Popuni [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md)
5. Upis u [CEO-G-PRODUCTION-EVIDENCE-LATEST.md](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)

**Brzi pregled:** [staging-owner-next.ps1](../scripts/staging-owner-next.ps1) | [owner-gates-quick.ps1](../scripts/owner-gates-quick.ps1) | [refresh-staging-handoff.ps1](../scripts/refresh-staging-handoff.ps1)

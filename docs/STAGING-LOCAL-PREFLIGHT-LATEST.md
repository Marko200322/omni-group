# Staging — lokalni preduslov (pre deploya na URL)

**Datum:** 2026-06-03  
**Commit za deploy:** [`68c19f7`](https://github.com/Marko200322/omni-group/commit/68c19f7)  
**CI:** Run [#87](https://github.com/Marko200322/omni-group/actions/runs/26916773900) — **5/5 PASS**

**Status:** _lokalno spremno; remote staging deploy ceka vlasnika_

Kopiraj relevantne redove u [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md) posle deploya na staging host.

---

## Lokalno zatvoreno (agent)

| Gate | Rezultat | Napomena |
|------|----------|----------|
| GitHub CI (monorepo) | **PASS** | Run #77–#86 zeleno |
| `branch-protection-ready.ps1` | **PASS** | spremno za GitHub Settings |
| `staging-smoke-remote.ps1` (127.0.0.1:3000) | **PASS** | `/health` + `smoke:all` |
| `owner-smoke-all.ps1` | **PASS** | ranije na istom commit-u |
| Atina `:3000` / Web `:3010` | **UP** | health OK |

**Disk C:** ~0.86 GB — ispod 1 GB; `staging-preflight` koristi `-MinDiskGb 1` ili oslobodi prostor pre punog gate-a.

---

## Vlasnik — posle deploya na staging URL

1. Deploy **`464185a`** (Atina + web + Nest po [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md))
2. **Backup DB** → `npm run migrate` na staging
3. Remote smoke:
   ```powershell
   $env:STAGING_ATINA_NODE_BASE='https://<STAGING_HOST>'
   .\scripts\staging-smoke-remote.ps1
   ```
4. Popuni [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md) — §1–§4 Pass/Fail
5. Upis u [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)

**Brzi pregled:** [`scripts/staging-owner-next.ps1`](../scripts/staging-owner-next.ps1)

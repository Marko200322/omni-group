# GitHub push — spremno lokalno

**Stanje (2026-05-17):** Commit **`2b4e366`** na `main`. Brzi pregled: `.\scripts\owner-status.ps1`. Handoff gate: `.\scripts\verify-agent-handoff.ps1`. **Nema** `origin` dok vlasnik ne doda URL.

**Pre push-a:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-agent-handoff.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\git-push-first-time.ps1 -RepoUrl "https://github.com/TVOJ-USER/TVOJ-REPO.git"
```

`git-push-first-time.ps1` automatski pokreće `pre-push-check.ps1 -SkipSmoke` pre push-a.

## Koraci (vlasnik, ~5 min)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
powershell -ExecutionPolicy Bypass -File .\scripts\git-push-first-time.ps1 -RepoUrl "https://github.com/TVOJ-USER/TVOJ-REPO.git"
```

Posle prvog push-a:

1. **Settings → Branches** — zaštiti `main` ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)).
2. Jedan test PR → proveri **CI (monorepo)** (5 jobova) — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md).
3. Popuni [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md).

**GitHub CLI (opciono):** `winget install GitHub.cli` → `gh auth login` → `gh repo create TVOJ-REPO --private --source=. --remote=origin --push`.

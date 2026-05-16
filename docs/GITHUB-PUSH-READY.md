# GitHub push — spremno lokalno

**Stanje (2026-05-16):** `git init` + commit na `main`. **Nema** `origin` dok vlasnik ne doda URL.

## Koraci (vlasnik, ~5 min)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
git remote add origin https://github.com/TVOJ-USER/TVOJ-REPO.git
git push -u origin main
```

Posle prvog push-a:

1. **Settings → Branches** — zaštiti `main` ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)).
2. Jedan test PR → proveri **CI (monorepo)** (5 jobova) — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md).
3. Popuni [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md).

**GitHub CLI (opciono):** `winget install GitHub.cli` → `gh auth login` → `gh repo create TVOJ-REPO --private --source=. --remote=origin --push`.

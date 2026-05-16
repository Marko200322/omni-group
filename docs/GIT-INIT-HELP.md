# Git init — pomoć za vlasnika (CEO A preduslov)

Repo trenutno **nema** `.git` u korenu. `.env` je već u `.gitignore` (koren + `atina-platform/atina/.gitignore`).

## Jednokratno (PowerShell, iz korena repoa)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
git init
git add .
git status
# proveri da .env NIJE u staged listi
git commit -m "Initial monorepo import (Atina SaaS, Nest, omnigroup-web, docs)."
git branch -M main
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

## Pre prvog commit-a

| Provera | Komanda / fajl |
|---------|----------------|
| `.env` ignorisan | `git check-ignore -v atina-platform/atina/.env` → mora pokazati `.gitignore` |
| Gate lokalno | `python -m pytest -q` · `cd atina-platform\atina; npm run test:ci` |
| CEO A posle push-a | [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) · [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) |

**Ne commituj:** `atina-platform/atina/.env`, `data/*.db`, `omni-shared-vault/`, `node_modules/`, `coverage/`, `tmp/`.

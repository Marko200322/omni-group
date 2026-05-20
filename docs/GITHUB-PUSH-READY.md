# GitHub push — spremno lokalno

**Stanje (2026-05-21):** Push na `origin/main`. Glavni commit: **`a370c25`** (Master Blueprint, 121 fajl). `.env` **nije** u repou. **CI:** [`Actions`](https://github.com/Marko200322/omni-group/actions) — job **`python`** / **`Python (Doslednost dok + pytest)`** ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)). Lokalni pun mirror: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) uključuje **`apps/omnigroup-web`** build i bundled Atina **`npm run smoke:all`**. Handoff: `.\scripts\verify-agent-handoff.ps1` — **PASS**.

**Pre push-a:**
```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
powershell -ExecutionPolicy Bypass -File .\scripts\verify-agent-handoff.ps1
git status
.\scripts\stage-master-blueprint.ps1
git push origin main
```

`stage-master-blueprint.ps1` radi `git add -A` i **unstage** `.env` / `.env.local`. Sa `-Commit` pravi commit automatski.

Ako prvi put na GitHubu za ovaj folder: `.\scripts\git-push-first-time.ps1 -RepoUrl "https://github.com/Marko200322/omni-group.git"` (pokreće `pre-push-check.ps1 -SkipSmoke`).

**Predlog commit poruke (kratko):**
```
feat(atina): Master Blueprint — agregatori, C-S-R moduli, queue, migrate 010

- 7 agregatora + CAPTCHA/DOMAIN/WEB3; deal-offer/validator/proxy idempotency
- test:ci 3170/3170; verify-monorepo Val 357; Nest supply-core specs
- docs: AGENT-CHECKLIST, handoff, wave-a PDF trace
```

## Koraci (vlasnik, ~5 min)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
powershell -ExecutionPolicy Bypass -File .\scripts\verify-agent-handoff.ps1
git push origin main
```

Posle prvog push-a:

1. **Settings → Branches** — zaštiti `main` ([`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)).
2. Jedan test PR → proveri **CI (monorepo)** (5 jobova) — [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md).
3. Popuni [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md).

**GitHub CLI (opciono):** `winget install GitHub.cli` → `gh auth login` → `gh repo create TVOJ-REPO --private --source=. --remote=origin --push`.

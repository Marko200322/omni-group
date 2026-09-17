# Test / CI / Evidence Gap Audit

**Repo:** `C:\dev\omni group`  
**Audit date:** 2026-08-04  
**Verdict:** Do **not** claim full prod green. CI and several prod business gates pass; merge protection, formal prod sign-offs, bundled HTTP smoke on prod URL, and Nest prod are open.

---

## 1. CI jobs (what runs, what does not)

### Monorepo gate — `C:\dev\omni group\.github\workflows\ci-monorepo.yml`

| Job id | Check name | Scope | In prod proof? |
|--------|------------|-------|----------------|
| `python` | Python (Doslednost dok + pytest) | Doc gate + root `pytest` (11 tests) | CI only |
| `atina-saas` | Atina SaaS (test:ci) | build, eslint, **unit** Jest only | CI only |
| `omnigroup-web` | Omnigroup web (Next.js build) | `npm ci` + `npm run build` | CI only |
| `atina-system` | Atina System (verify:ci) | build + unit + **migrations + 10 e2e** | CI only (Nest **not** on prod VPS) |
| `compose` | Compose (docker compose config) | 3× `docker compose config --quiet` | CI only |

**Not in monorepo CI:**
- `npm run smoke:all` (Atina bundled: login, `/me`, Forge, admin)
- `scripts\smoke-stack.ps1` (Astra + Nest + Node `/health`)
- Atina **`test:integration`** (only in package workflow)
- `sistem_naplate` pytest
- Prod fulfillment matrix / `smoke-platform-full.ps1`

### Other workflows
- `C:\dev\omni group\atina-platform\atina\.github\workflows\ci.yml` — unit + **integration** job (Postgres); runs on Atina-path pushes, **not** in monorepo F.4 mirror.
- `C:\dev\omni group\atina-system\.github\workflows\ci.yml` — Nest-only duplicate of `verify:ci`.

### CI status (documented)
- **PASS** — GitHub Run [#214](https://github.com/Marko200322/omni-group/actions/runs/26978285738), commit `46311d9`, **5/5** jobs (`C:\dev\omni group\docs\CI-GREEN-ON-MAIN.md`, `N2-0-3-EVIDENCE-LATEST.md`).
- **Gap:** No LATEST evidence that CI was re-run on current HEAD after Aug 2026 prod work; admin list references live prod state newer than last formal verify Val bump.

---

## 2. Branch protection

**Doc:** `C:\dev\omni group\docs\GIT-BRANCH-PROTECTION.md`  
**Evidence:** `C:\dev\omni group\docs\GIT-A-EVIDENCE-LATEST.md`

| Item | Status |
|------|--------|
| Rule on `main` | **OPEN** — not configured |
| Require PR before merge | **OPEN** |
| 5 required status checks | **OPEN** — doc ready, `gh auth login` blocked |
| Test PR confirmation | **OPEN** |
| Sign-off table | **Empty** — Pass/Fail unfilled |

CI is green; **merge is not mechanically gated** on GitHub.

---

## 3. LATEST evidence — Pass / Fail matrix

| File | Pass / Fail | Notes |
|------|-------------|-------|
| `docs\NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md` | **PASS** (Val **360**, 2026-06-03) | Full mirror incl. Nest **10/10 e2e**, Atina 3257/3257, web build |
| `docs\NIVO-1-SMOKE-EVIDENCE-LATEST.md` | **PASS** (Val **351**, 2026-05-14) | `smoke-stack.ps1` tri-stub only; **`npm run smoke:all` = N/A** in this file |
| `docs\GIT-A-EVIDENCE-LATEST.md` | **OPEN** | Branch protection |
| `docs\CEO-G-PRODUCTION-EVIDENCE-LATEST.md` | **OPEN** | All 8 CEO G sign-off rows blank |
| `docs\TYPEORM-PROD-EVIDENCE-LATEST.md` | **OPEN** | Nest prod not executed |
| `docs\VAULT-B-EVIDENCE-LATEST.md` | **PASS** (2026-05-05) | Local vault bind-mount only |
| `docs\STAGING-LOCAL-PREFLIGHT-LATEST.md` | **Partial PASS** | CI + local `127.0.0.1:3000` smoke; **remote staging deploy OPEN** |
| `docs\N2-0-3-EVIDENCE-LATEST.md` | **PASS** | CI green on `main`; branch protection still owner action |
| `docs\VPS-BACKUP-EVIDENCE-LATEST.md` | **PASS** (2026-08-04) | Cron + restore drill |
| `docs\MONOREPO-HEALTH-SNAPSHOT-LATEST.md` | **Stale** | Still cites Val **355** verify; file body contradicts Val 360 in verify LATEST |

**Prod-specific (not LATEST-named, Aug 2026):**
- `docs\ADMIN-JEDNA-LISTA.md` — fulfillment **850/850 PASS**, health/admin/contact PASS on `omnigrouptech.com`
- `docs\evidence\fulfillment-matrix-prod-full.csv` — sample shows **100 PASS**, 0 FAIL (subset; admin claims full 850)

---

## 4. What is **not** proven on prod

### `smoke:all`
| Environment | Proven? | Evidence |
|-------------|---------|----------|
| Local `127.0.0.1:3000` | **Yes** | `STAGING-LOCAL-PREFLIGHT-LATEST.md` (`staging-smoke-remote.ps1`, `owner-smoke-all.ps1`) |
| Prod `https://api.omnigrouptech.com` / prod app URL | **No** | CEO G row 7 empty; `NIVO-1-SMOKE-EVIDENCE-LATEST.md` explicitly excludes bundled smoke |
| Staging URL | **No** | `STAGING-LOCAL-PREFLIGHT` — remote deploy + `staging-smoke-remote.ps1` pending |

`smoke-stack.ps1` on prod is also **not** documented (and only hits Node `/health`, not login/Forge/admin).

### Nest e2e
| Layer | Proven? | Notes |
|-------|---------|-------|
| GitHub CI `verify:ci` | **Yes** | 10/10 e2e on ephemeral Postgres |
| Local `verify-monorepo` Val 360 | **Yes** | Same |
| **Prod VPS** | **No** | `ADMIN-JEDNA-LISTA.md` REDOM #5: **Nest not in live Docker stack** |
| Prod DB + `TYPEORM_SYNC=false` | **No** | `TYPEORM-PROD-EVIDENCE-LATEST.md` open |

Nest e2e in CI **does not substitute** for prod Nest — Nest is not deployed.

### Other prod gaps (from docs + test plan)
- Atina **integration** tests — not in monorepo CI (`docs\TEST-PLAN-KOMPLETAN.md` P1)
- `sistem_naplate` — not in root pytest (P2)
- `apps/omnigroup-web` — D.1 placeholder UI (35 `TODO[D.1-restore]`); build passes, real UI not restored
- Stripe live, company legal fields, non-Resend SMTP — CEO G open
- Staging ≈ prod parity — `STAGING-MIRROR-PROD.md` checklist incomplete

---

## 5. Ordered quality gates before “full prod green”

Priority order (blocking → supporting). Match `docs\ADMIN-JEDNA-LISTA.md` REDOM where applicable.

### Tier 0 — Governance (blocks “green” claim even if site works)
1. **GitHub branch protection** — `GIT-A-EVIDENCE-LATEST.md` Pass + 5 required checks (`GIT-BRANCH-PROTECTION.md`). Needs `gh auth login`.
2. **CEO G production sign-off (8 items)** — `CEO-G-PRODUCTION-EVIDENCE-LATEST.md`: prod build CI/server, staging migrations, prod `.env`, live payments, SMTP (if required), **`smoke:all` on prod URL**, admin monitoring curls, rollback owner.

### Tier 1 — Prod HTTP / API proof (your explicit ask)
3. **`npm run smoke:all` on prod** — e.g. `https://api.omnigrouptech.com` with admin creds; all 6 steps exit 0; record in CEO G + new smoke LATEST or staging execution log.
4. **`smoke-platform-full.ps1` / `staging-smoke-remote.ps1` on prod URL** — web + API combined gate (`scripts\smoke-platform-full.ps1`); not in CI, not in LATEST smoke file today.
5. **Remote staging pass first (recommended)** — deploy `46311d9`, run `staging-smoke-remote.ps1`, then mirror on prod (`STAGING-LOCAL-PREFLIGHT-LATEST.md`).

### Tier 2 — Nest / TypeORM prod (architecture gap)
6. **CEO C — Nest TypeORM prod** — `TYPEORM-PROD-EVIDENCE-LATEST.md`: `TYPEORM_SYNC=false`, backup, migrations on prod DB, boot sign-off.
7. **Nest in prod stack (or explicit N/A sign-off)** — today Nest is **out of VPS Docker**; without deploy, Nest e2e cannot be “prod green.” Either add Nest to prod + smoke, or document Nest as non-prod with signed scope reduction.

### Tier 3 — CI / test coverage gaps (pre-next-release hardening)
8. **Fresh monorepo verify LATEST** — re-run `verify-monorepo.ps1` on current HEAD, bump Val (last Val 360 = 2026-06-03; prod work Aug 2026 not reflected).
9. **Atina integration in CI path** — monorepo `atina-saas` skips integration; package CI or documented pre-merge obligation (`TEST-PLAN-KOMPLETAN.md` L1 DoD).
10. **Re-run GitHub CI on current HEAD** — confirm Run #214 equivalent after Aug changes.

### Tier 4 — Business / ops (admin list, not strictly “test green”)
11. Company legal / invoice fields (REDOM #3)
12. Stripe live + price IDs (REDOM #4) — if card payments required for “green”
13. Optional: Slack, external AI keys, staging VPS parity (REDOM #7–9)

---

## 6. What **is** legitimately green today

- **GitHub CI (monorepo)** — 5/5 on documented `main` run
- **Local full CI mirror** — Val 360 PASS incl. Nest e2e in test DB
- **Local multi-stack smoke** — Val 351 PASS (`smoke-stack`, not `smoke:all`)
- **Prod VPS ops** — backup/restore PASS; site up; admin login; contact/Resend; fulfillment matrix 850/850 per admin list
- **Vault B** — local PASS only

---

## 7. Bottom line

| Claim | Supported? |
|-------|------------|
| “CI green on `main`” | **Mostly yes** (documented; re-verify on HEAD) |
| “Local dev gates green” | **Yes** (verify + smoke-stack; `smoke:all` local per preflight, not in smoke LATEST) |
| “Prod site operational” | **Partially yes** (health, admin, fulfillment, contact) |
| **`smoke:all` proven on prod** | **No** |
| **Nest e2e proven on prod** | **No** (Nest not deployed) |
| **Full prod green** | **No** — Tier 0–2 open |

**Minimum to unblock the prod-green narrative:** Tier 0 (#1–2) + Tier 1 (#3–4) + explicit decision on Tier 2 Nest (#6–7).

[REDACTED]

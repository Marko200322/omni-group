## Verdict: live site does **not** depend on Python Astra / Python Forge / Nest

**Prod stack** (`docker-compose.prod.yml` → `scripts/deploy-to-vps.ps1`): `postgres`, `redis`, **`atina-api`** (Node Express), **`web`** (`apps/omnigroup-web`), optional **`caddy`**.

**Not deployed:** root Python stack (`forge`, Python `atina` worker, `astra`), Nest `atina-system`, `tools/youtube-pipeline`, `infra/k8s/base/nest-api`.

**Live wiring:** `omnigroup-web` → `NEXT_PUBLIC_ATINA_API_BASE` → Node API only. No `:8080`, no Nest `:3001`, no Python HTTP calls in app code. **Astra** in `brand.ts` is marketing copy only.

**Naming trap:** **Node Forge** (`/api/v1/forge/*`, `FORGE_VAULT_PATH=/var/omni/forge/vault.db` in prod) **is live** and separate from **Python Forge** (`src/forge/master_forge.py`, stub Oracle/AWS/Azure loop). Same word, different stacks.

---

## CEO H smoke matrix

| Stub | URL | Scope |
|------|-----|--------|
| Python Astra | `:8080/api/status` | Local Docker only |
| Nest | `:3001/` health | Local Docker only |
| Node | `:3000/health` | Local; prod uses bundled `npm run smoke:all` |

**CEO sekcija H** = local tri-stub via `scripts/smoke-stack.ps1`. Latest evidence: **Val 351 PASS** (2026-05-14) in `docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`. **Not a prod gate.** Prod fulfillment is **850/850 PASS** against live Atina API (`docs/ADMIN-JEDNA-LISTA.md`).

---

## Unused inventory (for go-live)

| Asset | Location | Status |
|-------|----------|--------|
| Python Forge worker | `src/forge/`, root `docker-compose.yml` | Local/CI only; stub budget loop |
| Python Atina worker | `src/atina/worker.py` | Local/CI only; supply-core batch |
| Python Astra UI/API | `src/astra/` | Local observability dashboard |
| Nest `atina-system` | `atina-system/`, `docker-compose.atina.yml` | CI + local; **explicitly not in live Docker** (`ADMIN-JEDNA-LISTA` #5) |
| K8s Nest manifest | `infra/k8s/base/nest-api/` | Template only; no prod deploy |
| YouTube/Celery pipeline | `tools/youtube-pipeline/` | Standalone; not in prod compose |
| Vault Python↔Node alignment | `docs/VAULT-ALIGNMENT-NOTES.md` | Not shared in prod (separate SQLite paths) |
| N3 Astra PDF trace | `docs/nivo3-wave-a/03-titanix-astra.md` | Vision/backlog |

**Still active in repo but not “multi-stack live”:** `pytest` + Nest `verify:ci` in CI monorepo gate; Express **`atina-system` module** inside Node API (different from Nest package).

---

## Ordered recommendation

### 1. Keep offline (repo + local/CI; do not deploy)
- Entire Python stack: `src/forge`, `src/atina`, `src/astra`, root `docker-compose.yml`
- Nest `atina-system` + `docker-compose.atina.yml` merge files
- `tools/youtube-pipeline`, `infra/k8s/base/nest-api`
- CEO **H** tri-stub as **dev/CI smoke only** — not prod release criteria

### 2. Wire later (post go-live / backlog #9)
- Nest TypeORM prod deploy (CEO **C** — migrations, `TYPEORM_SYNC=false`)
- Optional unified staging: Python + Nest + Node with shared vault bind-mount
- Full multi-stack prod only if a concrete product feature needs Nest queues or Python supply-core workers

### 3. Drop from go-live scope
- Python Astra HTTP/UI as a prod service
- Python Forge + Python Atina worker containers
- Nest as runtime dependency of omnigrouptech.com
- CEO **H** tri-stub as prod sign-off (replace with **`npm run smoke:all`** on prod + fulfillment matrix)
- K8s `nest-api` until there is an explicit orchestration decision

---

**Bottom line:** Live product = **Node SaaS + Next.js web**. Python Astra/Forge/Nest are parallel monorepo stacks for N1 CI, local smoke, and N3 vision — inventory, not production dependencies. Only **Node Forge** ships today.

[REDACTED]

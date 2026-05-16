# Nivo 1 — smoke evidence (template)

Copy, fill in, and attach to your gate/release record.

**Refs:** [Platform `scripts/README.md`](../../scripts/README.md) · koren monorepa: [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) · **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) (*Local notes — Smoke tests*) · [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md)) · [`scripts/README.md`](../../../../scripts/README.md) (**Port mismatch** za Nest/pg) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · [NIVO-1-START.md](../../../../NIVO-1-START.md) · [F.4 tim — matrica koraka](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md) · [NIVO-1-GATE.md](./NIVO-1-GATE.md)

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](../../../../docs/EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](../../../../docs/NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../../../../scripts/README.md) — **Kad podigneš novi broj**.

Jedan prolaz kao workflow **CI (monorepo)** — prvo **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../../../../scripts/README.md), zatim pytest i ostalo — uključujući **`apps/omnigroup-web`** build i job **`compose`** / tri `docker compose config` (lokalno ili na GitHub runneru): iz repo korena pokreni [`verify-monorepo.ps1`](../../../../scripts/verify-monorepo.ps1); bez Next build-a: **`-SkipOmnigroupWeb`**; bez Docker-a na kraju: **`-SkipCompose`**; bez Postgresa (lokalno): **`-SkipNestVerifyCi`** (Nest **`verify:n1`** umesto **`verify:ci`**); bez doc gate audita samo lokalno: **`-SkipDocAudit`** (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](../../../../docs/GIT-BRANCH-PROTECTION.md); u Actions i dalje pokreće audit); pun **`verify:ci`**: **Port mismatch** v. [`scripts/README.md`](../../../../scripts/README.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `docs/D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../../../../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **F.4:** [`NIVO-1-F4-TIM-CHECKLIST.md`](../../../../docs/NIVO-1-F4-TIM-CHECKLIST.md).

---

- **Date:**  
- **Operator:**  

### URLs tested

| | Base URL |
| --- | --- |
| Astra | |
| Nest | |
| Node (optional) | |

**`smoke-stack.ps1` vs `npm run smoke:all`:** iz repo korena, [`smoke-stack.ps1`](../../../../scripts/smoke-stack.ps1) je multi-stack HTTP (Astra + Nest + opcioni Node) — za ovaj Node servis samo **GET** `/health` kada je stub uključen. **`npm run smoke:all`** u **`atina-platform/atina`** pokriva login, `/me`, Forge i admin u jednom prolazu — formalni Atina release gate: [`release-gate-checklist.md`](./release-gate-checklist.md) (*Local notes — Smoke tests*); korenski vodič: [`scripts/README.md`](../../../../scripts/README.md).

### Commands (repo root unless noted)

```powershell
# Iz repo korena (omni group):
Set-Location "path\to\omni group"; .\scripts\smoke-stack.ps1  # par: npm run smoke:all (smoke:all) u atina-platform\atina — red ispod / release-gate-checklist.md
# Bundled Atina (login / Forge / admin): u atina-platform\atina → npm run smoke:all — release-gate-checklist.md (*Local notes — Smoke tests*).
# Tri stuba (uključujući Atina Node na :3000 ako API radi):
# .\scripts\smoke-stack.ps1 -SkipNode:$false   # par smoke:all kao gore
# Ili eksplicitna baza: .\scripts\smoke-stack.ps1 -AtinaNodeBase "http://127.0.0.1:3000"   # par smoke:all kao gore
# Get-Help .\scripts\smoke-stack.ps1 -Full   # vidi ../../../../scripts/README.md; bundled gate = npm run smoke:all
```

```powershell
# Opciono — pun red kao CI (prvo audit-doc-gate-references.ps1 — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u ../../../../scripts/README.md; zatim pytest + test:ci + omnigroup-web build + verify:ci + docker compose config). Required check: ../../../../docs/GIT-BRANCH-PROTECTION.md (job python).
Set-Location "path\to\omni group"; .\scripts\verify-monorepo.ps1  # ../../../../docs/GIT-BRANCH-PROTECTION.md
# Get-Help .\scripts\verify-monorepo.ps1 -Full   # vidi ../../../../scripts/README.md; ../../../../docs/GIT-BRANCH-PROTECTION.md
# Bez Next build-a: .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb  # ../../../../docs/GIT-BRANCH-PROTECTION.md
# Bez Docker compose koraka: .\scripts\verify-monorepo.ps1 -SkipCompose  # ../../../../docs/GIT-BRANCH-PROTECTION.md
# Bez Postgresa (Nest verify:n1 umesto verify:ci): .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi  # ../../../../docs/GIT-BRANCH-PROTECTION.md
# Bez doc gate audita (samo lokalno): .\scripts\verify-monorepo.ps1 -SkipDocAudit  # ../../../../docs/GIT-BRANCH-PROTECTION.md
```

```bash
# Iz kataloga atina-platform/atina (API mora raditi):
npm run smoke:all
```

Implementacija: `scripts/smoke-all.ps1` — `GET /health`, jedan `POST /auth/login`, isti JWT za `/auth/me`, `GET /api/v1/forge/status`, workflow execution-stats smoke (`smoke-atina-forge-workflow-template.ps1`), zatim `smoke-forge-admin.ps1`. Detalj i troubleshooting: [`release-gate-checklist.md`](./release-gate-checklist.md) (*Local notes — Smoke tests*).

Drugi API base (staging / drugi port): `npm run smoke:all -- -BaseUrl "https://staging.example"` (ili `http://127.0.0.1:3001`).

- Exit code / notes:  

### Pass / fail

| Check | PASS / FAIL |
| --- | --- |
| `smoke-stack.ps1` (par **`npm run smoke:all`**) | |
| `verify-monorepo.ps1` (opciono) · [GIT-BRANCH-PROTECTION.md](../../../../docs/GIT-BRANCH-PROTECTION.md) | |
| `npm run smoke:all` | |
| Astra URL | |
| Nest URL | |
| Node URL (if used) | |

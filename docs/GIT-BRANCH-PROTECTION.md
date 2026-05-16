# GitHub: branch protection on `main`

Audience: **repository owner** (or org admin) configuring **Settings** for this monorepo.

Goal: keep **`main`** merge-safe by requiring **pull requests** before merge. **Required status checks** are optional but recommended once Actions runs are stable.

**Repo dokovi u browseru (contributors):** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

## 1. Open branch protection for `main`

1. On GitHub: repo **Settings** → **Branches**.
2. Under **Branch protection rules**, click **Add branch protection rule** (or edit the existing rule for `main`).
3. **Branch name pattern:** `main` (if your default branch is `master`, use that pattern instead).

## 2. Require a pull request before merging

1. Enable **Require a pull request before merging**.
2. Optionally tighten review policy (e.g. **Require approvals**, **Dismiss stale pull request approvals when new commits are pushed**) per team process.

Direct pushes to `main` are then blocked unless an admin bypasses the rule (if allowed).

## 3. (Optional) Require status checks to pass

1. Enable **Require status checks to pass before merging**.
2. Enable **Require branches to be up to date before merging** if you want PR branches rebased/merged with `main` before merge.

GitHub only lists checks that have **already run** on the repo (often after at least one run on the default branch or on the PR). Pick the checks that correspond to the monorepo workflow:

- Workflow file: **[`.github/workflows/ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml)**  
- Workflow `name` (shown in the Actions tab): **`CI (monorepo)`**

Jobs in that file (YAML **job id** → job **`name:`** as shown in Actions / typical check label):

| Job id           | Job `name:` (status check label)   |
| ---------------- | ---------------------------------- |
| `python`         | **Python (Doslednost dok + pytest)** |
| `atina-saas`     | **Atina SaaS (test:ci)**           |
| `omnigroup-web`  | **Omnigroup web (Next.js build)**   |
| `atina-system`   | **Atina System (verify:ci)**       |
| `compose`        | **Compose (docker compose config)** |

In the **required checks** search box, GitHub often shows entries like **`CI (monorepo) / Python (Doslednost dok + pytest)`** (workflow display name + job display name). Select **all five** jobs above if you want the full gate enforced before merge.

**Note:** Branch protection does not change *what* the jobs run; it only gates merge on green checks if you enable this section. The same commands are documented in **[`CONTRIBUTING.md`](../CONTRIBUTING.md)** and **[`docs/NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md)**. The `python` job’s first step is **`audit-doc-gate-references.ps1`** (reference checks on `*.md`, `*.txt`, `*.yml`, `*.yaml`, `*.ps1`, `*.ini` — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); isti *indeks + dry-run* obrazac kao u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md)). Ako u listi check-ova još vidiš starije oznake (**`Python (pytest)`** ili **`Python (doc audit + pytest)`**), to su stari run-ovi — posle novog zelenog run-a na `main` / PR-u u required checks izaberi **`Python (Doslednost dok + pytest)`** (vidi `name:` u [`ci-monorepo.yml`](../.github/workflows/ci-monorepo.yml)). Ako je pravilo već vezano za staro ime, posle prvog novog run-a ažuriraj izbor check-a na novo ime.

**Local parity (same steps as CI):** from repo root, **[`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1)** mirrors the monorepo workflow (GitHub job **`python`**, required check **`Python (Doslednost dok + pytest)`** — naming in [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) odjeljak 3; includes **`apps/omnigroup-web`** unless **`-SkipOmnigroupWeb`**). See **[`scripts/README.md`](../scripts/README.md)** for switches and **Port mismatch** (`POSTGRES_PORT` vs host DB port). After services are up, optional multi-stack HTTP: **[`smoke-stack.ps1`](../scripts/smoke-stack.ps1)** (Atina Node = **GET** `/health` when probed). Bundled Atina HTTP (login, `/me`, Forge, admin): **`npm run smoke:all`** in `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14). **Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**When bumping Val numbers repo-wide · Kad podižeš novi Val širom dokova:** section **Kad podigneš novi broj** in [`scripts/README.md`](../scripts/README.md).

## 4. Other settings (optional)

- **Require conversation resolution before merging** — useful for review threads.
- **Require linear history** — optional; affects merge button strategies.
- **Do not allow bypassing the above settings** — restrict admins if policy requires it.

Save the rule. Confirm with a test PR: merge should be blocked until checks pass (if required) and until PR requirements are met.

**Evidencija za CEO sekciju A:** šablon u [`GIT-A-EVIDENCE.template.md`](./GIT-A-EVIDENCE.template.md) (popuni posle podešavanja; link iz [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) **u CEO sekciji A**).

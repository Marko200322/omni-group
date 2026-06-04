# Paket vlasnika — jedan dan, deset stavki, kraj

**Svrha:** jedinstven plan kojim **vlasnik** zatvara preostalih **10 stavki** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md). Svaka stavka ima **šablon** (popunjavaš), **runbook** (čitaš) i **mesto gde se kvačica `[x]` lepi**. Agent / repo je sve ostalo zatvorio (~85% liste je `[x]`).

**Čitaj redom — gornje stavke su preduslov za donje.** Vremenske procene su za nekoga ko prvi put radi staging→prod release.

**Pregled stanja:** [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) · šira slika: [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## Mapa: 10 stavki → 4 koraka → ti

| Korak | Šta uradiš | Vreme | CEO sekcija (broj `- [ ]`) | Šablon (popunjavaš) | Runbook (čitaš) |
|-------|------------|-------|---------------------------|---------------------|-----------------|
| **1** | GitHub branch protection na `main` | 5–10 min | **A** (1 stavka, red 69) | [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) | [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) |
| **2** | Prod TypeORM migracije + `TYPEORM_SYNC=false` (Nest) | 15–60 min | **C** (1 stavka, red 95) | [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) | [`atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) |
| **3** | Atina Node SaaS produkcioni gate (build, env, payments, SMTP, smoke, admin, rollback) | 1–3 h | **G** (8 stavki, redovi 226–234, bez 227) | [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) | [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) · [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) |
| **4** | _(opciono)_ N2 red **0.3** — kontinuirani CI green na `main` | 10–30 min | N2 master red 0.3 | [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md) | [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md) |

**Pratece reference (čitaj uz Korak 3):** sve env varijable za prod u jednom mestu — [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md). **Lokalni preduslov pre staging deploya:** [`scripts/staging-preflight.ps1`](../scripts/staging-preflight.ps1) — **PASS lokalno** 2026-06-03 (`-SkipAtinaTestCi`; brzo: `-MinDiskGb 1`). **Posle deploya na staging:** [`scripts/staging-smoke-remote.ps1`](../scripts/staging-smoke-remote.ps1) (`STAGING_ATINA_NODE_BASE`). **CI + branch protection:** [`branch-protection-ready.ps1`](../scripts/branch-protection-ready.ps1) · probni PR: [`prepare-branch-protection-pr.ps1`](../scripts/prepare-branch-protection-pr.ps1). **Brzi lokalni gate:** [`owner-gates-quick.ps1`](../scripts/owner-gates-quick.ps1) · handoff: [`refresh-staging-handoff.ps1`](../scripts/refresh-staging-handoff.ps1). **Disk:** [`disk-report.ps1`](../scripts/disk-report.ps1).

**Stanje repoa (2026-06-04):** CI Run [#151](https://github.com/Marko200322/omni-group/actions/runs/26934393505) zelen (`c023ae9`) - handoff: [STAGING-LOCAL-PREFLIGHT-LATEST.md](./STAGING-LOCAL-PREFLIGHT-LATEST.md) - **ceka vlasnika:** branch protection + staging deploy na URL.

**Total ako sve uradiš za jedan dan:** ~2–4 sata aktivnog rada (uz pauze za webhook test i staging cool-down).

---

## Koraci, jedan po jedan

### Korak 1 — `main` zaštićen, PR obavezan _(5–10 min)_

**Cilj:** zatvoriti **CEO sekciju A** (red 69 u glavnoj matrici).

1. Otvori `https://github.com/<tvoj-org>/<repo>/settings/branches`.
2. **Add branch protection rule** za `main`:
   - ✅ Require a pull request before merging
   - _(opciono)_ ✅ Require approvals = 1
   - _(opciono)_ ✅ Require status checks — izaberi svih **5** iz `CI (monorepo)`: `Python (Doslednost dok + pytest)`, `Atina SaaS (test:ci)`, `Omnigroup web (Next.js build)`, `Atina System (verify:ci)`, `Compose (docker compose config)`.
3. Sačuvaj. Pokreni jedan test PR da potvrdiš da merge bez PR-a ne radi.
4. Popuni [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md).
5. Otvori [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), red **69** → `- [ ]` postaje `- [x]`.

> Ako repo još nije na GitHub-u: prvo `git init` + `git remote add origin …` + push.

---

### Korak 2 — Prod TypeORM migracije _(15–60 min)_

**Cilj:** zatvoriti **CEO sekciju C** (red 95 u glavnoj matrici).

**Preduslov:** imaš pristup pravoj prod Postgres bazi (host, korisnik, lozinka, db ime).

1. Backup pre svega: `pg_dump -F c -Z 9 -f atina-system-prod-$(date +%Y%m%d-%H%M).dump …` (vidi [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) Korak 2).
2. Postavi prod env (`NODE_ENV=production`, `TYPEORM_SYNC=false`, `POSTGRES_*`, `POSTGRES_SSL=true`).
3. Iz `atina-system/`: `npm ci && npm run build && npm run migration:run`.
4. Verifikuj: `SELECT name FROM migrations ORDER BY id DESC LIMIT 5;` mora pokazati poslednje migracije iz repo-a.
5. Deploy nove aplikacije sa istim env-om. `GET /health` PASS.
6. Popuni [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md).
7. [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), red **95** → `[x]`.

---

### Korak 3 — Atina Node SaaS produkcija _(1–3 h)_

**Cilj:** zatvoriti **CEO sekciju G** (redovi 226, 228–234 — 8 stavki) u glavnoj matrici.

Detaljan redosled koraka u [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md). Ukratko:

1. **`npm run build`** u prod CI / na serveru — PASS.
2. **Migracije na stagingu** — primenjene, log čist.
3. **Prod `.env`** — `NODE_ENV=production`, `JWT_SECRET` ≥32 znaka (random), `ADMIN_PASSWORD` ≠ `Admin@123456`, `DB_SSL=true`, payments / SMTP / vault / CORS popunjeni. Lokalni redosled agregatora: [`VLASNIK-ENV-POPUNI.md`](./VLASNIK-ENV-POPUNI.md).
4. **Stripe live** — `sk_live_…`, webhook endpoint dodat, **Send test webhook** = HTTP 200. _(PayPal / Wise — analogno, opciono.)_
5. **SMTP** — `SMTP_*` postavljeni, jedan testni email PASS. _(N/A ako ne šalješ email.)_
6. **Smoke:** `npm run smoke:all -- -BaseUrl "https://app.<domen>"` u `atina-platform/atina/` — exit 0, svih 6 koraka PASS.
7. **Admin monitoring:** `GET /api/v1/admin/overview` i `…/workflow-templates/execution-stats` → 200 + smislen JSON.
8. **Rollback:** vlasnik definisan (ime, kontakt), thresholds zapisani, redeploy + revert/restore put proveren.

Popuni [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md). Otvori [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md), redove **226, 228–234** — sve `[x]`.

---

### Korak 4 — _(opciono)_ N2 red **0.3** — CI green na `main`

**Cilj:** zatvoriti poslednji `[ ]` u N2 master listi (kontinuirani zelen `CI (monorepo)` na svakom merge-u na `main`).

Detaljan ritual (test PR → 5 zelenih jobova → merge → run URL): [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md). Šira referenca: [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md).

## Jedan red provere kad misliš da si gotov

```text
1. GIT-A-EVIDENCE-LATEST.md            → tabela popunjena, Pass
2. TYPEORM-PROD-EVIDENCE-LATEST.md     → tabela popunjena, Pass
3. CEO-G-PRODUCTION-EVIDENCE-LATEST.md → 9 redova popunjeno, sve PASS / N/A sa razlogom
4. CHECKLIST-CEO-SISTEM.md             → 0 otvorenih `- [ ]` u CEO sekcijama A–H (preostalih 10 sad sve `[x]`)
5. (opciono) N2-0-3-EVIDENCE-LATEST.md → tabela popunjena + link na Actions run
6. (opciono) NIVO-2-MASTER-CHECKLIST.md → red 0.3 = `[x]`
```

**Posle ovoga:** Nivo 1 + Nivo 2 + Nivo 3 inženjerski = 100%; **CHECKLIST-CEO-SISTEM.md** = 100% (68/68).

---

## Šta agent **ne radi** (zato si ti ovde)

- Kreiranje GitHub repository / branch protection (treba tvoj nalog).
- Kupovina Stripe / PayPal / Wise live ključeva (treba tvoj nalog + kreditna kartica).
- Postavljanje prod servera, DNS-a, TLS sertifikata.
- Postavljanje prod Postgres baze, secret managera, kreiranje SMTP relay naloga.
- Bivanje rollback "lice" u pager rotaciji.

**Šta agent radi i ostaje aktuelno:** lokalni full monorepo gate (`scripts/verify-monorepo.ps1`), `audit-doc-gate-references.ps1`, smoke skripte, Doslednost dok, Val ažuriranja, ažuriranje **`Python (Doslednost dok + pytest)`** check naming-a, kontekst za `apps/omnigroup-web` (tj. `omnigroup` prisustvo u dokovima i opcioni `SkipOmnigroup`), kao i pratećih `smoke:all` parova uz `smoke-stack` u runbook-ovima — sve to je već zatvoreno do **Val 355 / Val 351** (verify 2026-05-14 + smoke 2026-05-14; Val 355 = pun mirror sa D.1 placeholder Iter 2 — server-side fetch po dokumentovanom F4-2 ugovoru — vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md); ranije Val 354 / 2026-05-13 = pun mirror sa D.1 placeholder rekonstrukcijom za `apps/omnigroup-web` — vidi [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md)).

---

*Verzija: paket vlasnika v1 (2026-05-13). Ažuriraj samo polja unutar šablona; ne briši runbook reference.*

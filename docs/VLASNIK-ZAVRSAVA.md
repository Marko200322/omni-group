# Samo ti završavaš — šta automatika ne može (Faze 1–4)

**Svrha:** jedna lista bez šume. Inženjerstvo u repou (sanitizacija, šabloni, lokalni build dokaz) je urađeno gde je moguće; **ispod su isključivo koraci koji zahtevaju tvoj nalog, server ili novac.**

**Brzi paket (jedan dan, 4 koraka):** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) — popunjavaš šablone redom, na kraju 0 otvorenih stavki u CEO matrici.

**Sve env varijable za prod u jednom dokumentu (uz primere i validaciona pravila):** [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md).

**Povezano:** [`AKCIONI-PLAN-NOVITETI-I-CEO.md`](./AKCIONI-PLAN-NOVITETI-I-CEO.md) · [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) · [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) · **Agent deploy handoff (sekcija I):** [`AGENT-DEPLOY-CHECKLIST.md`](./AGENT-DEPLOY-CHECKLIST.md).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub (lista repo dokova u browseru):** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Faza 1 — [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (10 otvorenih stavki u suštini)

### CEO sekcija A — Git (prvi `- [ ]` u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md))

1. Na **GitHub-u** (ili drugom hostu): **Settings → Branches** — zaštiti **`main`**, uključi **Require a pull request before merging** (detalji: [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)).
2. Opciono: obavezni status checkovi iz workflow-a **CI (monorepo)** — svih **pet** jobova (vidi tabelu u [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); job **`python`** u Actions / branch protection: **`Python (Doslednost dok + pytest)`** — **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md); uklj. i job **`omnigroup-web`**).
3. Popuni i sačuvaj [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md), pa u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) stavi **`[x]`** na stavku **CEO sekcije A**.

### CEO sekcija C — Nest / TypeORM produkcija

1. Na **pravoj produkcijskoj** bazi: **`TYPEORM_SYNC=false`** u `.env`.
2. Pokreni migracije iz `atina-system` prema [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md).
3. Popuni [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md), pa **`[x]`** na stavku **CEO sekcije C** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

### CEO sekcija G — Atina Node SaaS produkcija (blok stavki)

Redom na **staging pa produkcija** (runbook-i u tabeli ispod):

1. **`npm run build`** na CI/serveru kao u produkciji — *lokalno je `tsc` već prošao 2026-05-08 (vidi [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md)).*
2. Migracije pregledane na **stagingu**.
3. **`.env` produkcija** — prave tajne, `NODE_ENV=production`, `DB_SSL` ako treba.
4. **Stripe / PayPal / Wise live** + webhook secreti (ako koristiš plaćanja).
5. **SMTP** ako je email obavezan.
6. **Smoke:** `npm run smoke:all` u `atina-platform/atina` (health, login, `/me`, `forge/status`, execution-stats, forge-admin — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Smoke tests*; pojedinačno: `package.json` `smoke:*`). Za **tri-stub** HTTP iz korena repoa (Astra + Nest + opcioni Node **GET** `/health`): [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) — [`scripts/README.md`](../scripts/README.md) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md).
7. **Admin monitoring** rute — [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) (*Admin* / execution-stats) i tabela u [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md); uskladiti sa redovima **CEO sekcije G** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).
8. **Rollback:** ko i kada — dokumentuj u evidenciji.

Popuni [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) i onda označi svaku stavku **CEO sekcije G** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

**Runbook-i:** [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) · [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) · [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md).

---

## Faza 2 — Nivo 2 (preostalo uz Git)

| Šta | Ti uradiš |
|-----|-----------|
| **P.1** `[x]` | Zatvoreno u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) (lokalni F.4 mirror). Branch protection na GitHub `main` i dalje vidi **CEO sekcija A** / [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md). **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 360** / 2026-06-03). |
| **0.3** `[x]` | Zatvoreno u N2 master listi + [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md) (Pass). Kontinuirani ritual na GitHub `main` i dalje možeš potvrditi u Actions kad koristiš host. |

*(Ostali redovi N2 master liste već **`[x]`** u repou.)*

---

## Faza 3 — Nivo 3

- PDF / vizionarski opseg: sledeći koraci su u [`NIVO-3-START.md`](../NIVO-3-START.md) i [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md). **Nema jednog API poziva koji to zatvara** — to je odluka šta ulazi u proizvod + eventualni stranični audit PDF-ova.

---

## Faza 4 — Noviteti (legitiman deo)

- **Isporučeno u repou:** Next.js sajt + dashboard/admin shell — [`apps/omnigroup-web/`](../apps/omnigroup-web/); YouTube/Celery pipeline — [`tools/youtube-pipeline/`](../tools/youtube-pipeline/). Detalji: [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md). Kanonski SaaS backend (F4-3): [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md). Ostaje na tebi: povezivanje fronta na Atina API, live plaćanja u frontu ako želiš odvojeno od Express stacka.

### Agent deploy handoff — Omni Group web (2026-05-17)

Agent je završio [`AGENT-DEPLOY-CHECKLIST.md`](./AGENT-DEPLOY-CHECKLIST.md). **Ti zatvaraš** stavke u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) **sekcija I**:

| # | Ti uradiš | Dokaz / skripta |
|---|-----------|-----------------|
| I.1 | GitHub prv push (`origin` + `main`) | [`GITHUB-PUSH-READY.md`](./GITHUB-PUSH-READY.md) · `verify-agent-handoff.ps1` · `git-push-first-time.ps1` |
| I.2 | Disk **≥5 GB** na `C:` | `disk-report.ps1` · `free-disk-space.ps1` |
| I.3 | Resend u `apps/omnigroup-web/.env.local` | `test-contact-resend.ps1` → `sent_via_resend` |
| I.4 | `atina-platform/atina/.env` agregatori + Stripe | `check-atina-aggregators.ps1` · `check-stripe-env.ps1` |
| I.5 | Staging deploy | [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) |
| I.6 | (Opciono) Atina SMTP staging | [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) |

U PowerShell-u za npm koristi **`npm.cmd`** (ne `npm`) ako ExecutionPolicy blokira `npm.ps1` — ili `.\scripts\run-local-gates.ps1`.

---

## Jedan red provere kad misliš da si gotov

1. [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) — Pass.  
2. [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) — Pass.  
3. [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) — sve PASS ili N/A sa razlogom.  
4. Ažuriraj [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) sve `- [ ]` koje si zatvorio → `[x]` (uklj. **sekcija I** agent deploy handoff).

*Poslednji put ažurirano: 2026-05-17.*

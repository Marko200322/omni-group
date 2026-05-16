# Samo ti završavaš — šta automatika ne može (Faze 1–4)

**Svrha:** jedna lista bez šume. Inženjerstvo u repou (sanitizacija, šabloni, lokalni build dokaz) je urađeno gde je moguće; **ispod su isključivo koraci koji zahtevaju tvoj nalog, server ili novac.**

**Brzi paket (jedan dan, 4 koraka):** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) — popunjavaš šablone redom, na kraju 0 otvorenih stavki u CEO matrici.

**Sve env varijable za prod u jednom dokumentu (uz primere i validaciona pravila):** [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md).

**Povezano:** [`AKCIONI-PLAN-NOVITETI-I-CEO.md`](./AKCIONI-PLAN-NOVITETI-I-CEO.md) · [`CEO-OPEN-BULLETS-RUNBOOK.md`](./CEO-OPEN-BULLETS-RUNBOOK.md) · [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md).

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
| **P.1** `[ ]` | Ako koristiš GitHub: poveži **zelen CI na `main`** (svih **pet** jobova u **CI (monorepo)**; job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md): **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md), zatim `pytest`; uklj. **`omnigroup-web`**) sa branch protection. Ako ne koristiš GitHub: timski dogovor da je **F.4** i dalje [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (isti red kao CI: **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) + pytest + npm/compose; opciono **`-SkipOmnigroupWeb`** samo ako je dogovoreno; **`-SkipDocAudit`** samo lokalno; **Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md); **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14)) pre merge-a — pa **`[x]`** u [`NIVO-2-MASTER-CHECKLIST.md`](../NIVO-2-MASTER-CHECKLIST.md) uz kratku napomenu. |
| **0.3** `[ ]` | Isto: obavezno zelen CI na svakom merge-u **samo ako postoji GitHub**; inače interni gate. |

*(Ostali redovi N2 master liste već **`[x]`** u repou.)*

---

## Faza 3 — Nivo 3

- PDF / vizionarski opseg: sledeći koraci su u [`NIVO-3-START.md`](../NIVO-3-START.md) i [`NIVO-3-MASTER-CHECKLIST.md`](../NIVO-3-MASTER-CHECKLIST.md). **Nema jednog API poziva koji to zatvara** — to je odluka šta ulazi u proizvod + eventualni stranični audit PDF-ova.

---

## Faza 4 — Noviteti (legitiman deo)

- **Isporučeno u repou:** Next.js sajt + dashboard/admin shell — [`apps/omnigroup-web/`](../apps/omnigroup-web/); YouTube/Celery pipeline — [`tools/youtube-pipeline/`](../tools/youtube-pipeline/). Detalji: [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md). Kanonski SaaS backend (F4-3): [`FAZA-4-SAAS-DECISION.md`](./FAZA-4-SAAS-DECISION.md). Ostaje na tebi: povezivanje fronta na Atina API, live plaćanja u frontu ako želiš odvojeno od Express stacka.

---

## Jedan red provere kad misliš da si gotov

1. [`GIT-A-EVIDENCE-LATEST.md`](./GIT-A-EVIDENCE-LATEST.md) — Pass.  
2. [`TYPEORM-PROD-EVIDENCE-LATEST.md`](./TYPEORM-PROD-EVIDENCE-LATEST.md) — Pass.  
3. [`CEO-G-PRODUCTION-EVIDENCE-LATEST.md`](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) — sve PASS ili N/A sa razlogom.  
4. Ažuriraj [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) sve `- [ ]` koje si zatvorio → `[x]`.

*Poslednji put ažurirano: 2026-05-08.*

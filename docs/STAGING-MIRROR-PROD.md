# Staging kao ogledalo produkcije (DB / tajne / smoke)

**Svrha:** konkretan checklist da **staging** koristi isti *obrazac* kao **produkcija** (imena env promenljivih, migracije, tajne, smoke), bez mešanja prod ključeva sa staging vrednostima. Ovo je **preduslov** pre redovnog staging gate-a u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) i usklađuje se sa formalnim *Smoke tests* i integracionim preduslovima u [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md).

**Monorepo evidencija:** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Povezano (master plan):** [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) — **odjeljak 4.3** (*Staging* mirroring prod).

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## 1. Paritet imenovanja env (isti ključevi, drugačije vrednosti)

- [ ] **Isti skup ključeva** kao u produkciji za svaki servis koji ide na staging (nema „samo na prod“ varijabli bez dokumentovanog izuzetka). Za Atina Node: uporedi staging `.env` / secret store sa [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example) i matricom u [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local prerequisites — Atina Node* — npr. **`DB_NAME`**, host/port, SSL).
- [ ] **Semantički isti flagovi** (`NODE_ENV`, `DB_SSL` / `POSTGRES_SSL`, `TYPEORM_SYNC` gde važi) — vrednosti prilagođene okruženju, ali ista logika uključivanja/isključivanja ponašanja kao na prod.
- [ ] **Dokumentuj izuzetke** (jedina varijabla koja je drugačija po imenu ili koja je N/A na stagingu) u release belešci ili [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md) (staging deo).

---

## 2. Paritet migracija baze (isti redosled i ista pravila kao pre prod-a)

- [ ] **Node (Atina SaaS):** migracije na staging DB primenjene **jednom** po release kandidatu, posle review-a diff-a — redosled i checklist stavke kao u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) **§2** (*Migrations review (staging)*: snapshot, diff, rizik, *apply once*, health).
- [ ] **Nest (`atina-system`):** ako je u istom release-u, isti princip — novi fajlovi pod `atina-system/src/database/migrations/` u diff-u; **`TYPEORM_SYNC=false`** i CLI migracije kao u [`TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) (staging = ista procedura kao prod, druga baza / kredencijali).
- [ ] **Integracioni preduslov (Atina Node):** staging API mora čitati **`DB_NAME`** (npr. dedicirana baza kao u release-gate primeru **`atina_saas_db`**) sa **primeljenim** `npm run migrate` (ili ekvivalent deploy job-a) — vidi [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Integration tests* / *Local prerequisites*; greške tipa „relation does not exist“ = pogrešna instanca ili bez migracija).

---

## 3. Tajne (pattern kao prod, vrednosti nikad prod)

- [ ] **Store:** isti mehanizam kao produkcija (secret manager / sealed env / CI injekcija) — ne držati staging tajne samo u neverzionisanom fajlu na laptopu bez odgovarajućeg para u prod runbook-u.
- [ ] **Stripe / PayPal / webhook:** **sandbox** ključevi i webhook signing secreti na stagingu; nikad live prod secret na staging — uskladiti sa [`NIVO-2-STAGING-WEBHOOKS.md`](./NIVO-2-STAGING-WEBHOOKS.md) i korakom **§5** u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md).
- [ ] **Forge / vault putanje:** isti obrasci mount-a i dozvola kao u prod dokumentaciji (izbegavati `SQLITE_READONLY` zbog drugačijeg bind mount-a) — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests* (Forge / `FORGE_VAULT_PATH`); zajednički vault runbook: [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md) gde važi.

---

## 4. Smoke paritet sa produkcijom (isti ritual, drugi URL)

- [ ] **Multi-stack HTTP:** na staging hostovima pokrenuti [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) sa **staging** bazama (ne `localhost`) — detalji u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) **§4**; uskladiti sa monorepo smoke evidencijom ([`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) kada beležiš prolaz).
- [ ] **Bundled Atina Node:** `smoke-stack` za Node pokriva samo **`GET /health`** — za login, `/me`, Forge i admin kao u prod gate-u pokrenuti **`npm run smoke:all -- -BaseUrl "https://<STAGING_HOST>"`** iz `atina-platform/atina` — obavezno polje *Smoke tests* u tabeli mandatory gates u [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) i *Local notes — Smoke tests* (razlika `smoke-stack` vs `smoke:all`).
- [ ] **Pre promocije u prod:** zatvoriti pun staging gate (§2–§5) u [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md), zatim tek produkcioni koraci iz [`deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md).

---

## 5. Definicija „gotovo“ (za red #17 master liste)

Smarta se **mirror pattern** kada su §1–§4 potvrđeni za trenutni release kandidat i zabeleženi u evidenciji (npr. staging deo [`CEO-G-PRODUCTION-EVIDENCE.template.md`](./CEO-G-PRODUCTION-EVIDENCE.template.md) ili odgovarajući `*-EVIDENCE-LATEST.md` po dogovoru). Samo dokument u repou ne zatvara operativni red — vlasnik/tim potvrđuje izvršenje.

**Šablon za kratki izvršni zapis (kopiraj sekcije — datum, vlasnik/owner, checklist vs ovaj dokument §1–§4, migracije, smoke refs, opciono SMTP, Pass/Fail):** [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md).

---

## 6. Repou priprema (agent, 2026-05-16)

- [x] Runbook-i i šabloni usklađeni (`STAGING-RELEASE-CHECKLIST`, `STAGING-EXECUTION-LOG.template`, `CEO-G` šabloni).
- [x] `apps/omnigroup-web` **`npm run build`** PASS (D.1 placeholder komponente u repou).
- [ ] **Izvršenje na staging hostu** (§1–§4) — vlasnik posle deploy-a i `.env`.

# Prazni `.md` dokumenti — runbook (2026-05-14)

**Refs:**

- [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) — paralelan runbook za **D.1** (`apps/omnigroup-web` prazni `*.tsx` izvori); isti uzorak (OneDrive Files-On-Demand `ReparsePoint` atribut) i sličan tok rešavanja
- [`scripts/audit-doc-gate-references.ps1`](../scripts/audit-doc-gate-references.ps1) — doc gate koji **ne** detektuje prazne fajlove jer ne sadrže pairing okidače (`verify-monorepo`, `smoke-stack`, `EVIDENCE-INDEX`); **ovaj runbook** je dopuna gate-a i pokriva content-only kvalitet
- [`scripts/check-doc-links.ps1`](../scripts/check-doc-links.ps1) — **markdown link skener** koji **detektuje** ovih 5 fajlova kao "empty targets" (linkovi ka 0-byte fajlovima) i prijavljuje ih sa upućenjem na ovaj runbook. Snapshot 2026-05-14 (Val 355): **22 empty target reference** vode na 5 fajlova iz tabele ispod (savršen cross-check)
- [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) · bundled Atina **`npm run smoke:all`** (formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*)
- **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14 (D.1 Iter 2 — vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)
- **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14
- **Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md)

> **Svrha dokumenta:** registrovati 5 dehidriranih `.md` fajlova u izvoru monorepa (svi imaju `Length=0` i `Archive, ReparsePoint` atribute — OneDrive Files-On-Demand placeholder bez cloud sadržaja) i pružiti redosled za vlasnik-restore. **Nije CI gate failure** — `verify-monorepo.ps1` (Val 355) prolazi uprkos ovim fajlovima jer doc gate ne pokriva prazan content i nijedan test ih ne učitava. Ali svaki klik na link u repu daje korisniku prazan fajl, što degradira navigaciju.

---

## Snapshot 2026-05-14

| Fajl | Veličina | Atributi | Reference (gde se klik gubi) | Očekivani sadržaj (na osnovu konteksta) |
|------|----------|----------|------------------------------|------------------------------------------|
| `atina-platform/atina/docs/operations/EMAIL-SURFACE.md` | 0 B | `Archive, ReparsePoint` | [`atina-platform/atina/.github/dependabot.yml`](../atina-platform/atina/.github/dependabot.yml) · `apps/omnigroup-web/src/app/dev/docs/page.tsx` (Talas 37) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) | Email transport surface (SMTP, transporter, templates, password reset / register / notifications); povezano sa **`nodemailer`** P1.A iz [`NPM-AUDIT-MONOREPO.md`](./NPM-AUDIT-MONOREPO.md) |
| `atina-platform/atina/docs/operations/LOGGING-NOTES.md` | 0 B | `Archive, ReparsePoint` | [`scripts/README.md`](../scripts/README.md) (Povezani dokumenti) · [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) (Atina Winston) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (Talasi 10–11) · [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) · [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md) · [`atina-platform/atina/CONTRIBUTING.md`](../atina-platform/atina/CONTRIBUTING.md) | Atina Winston logging napomene (logger config, levels, request id propagation, redacted fields) |
| `atina-system/docs/QUEUE-SMOKE-DEV.md` | 0 B | `Archive, ReparsePoint` | [`scripts/README.md`](../scripts/README.md) (Nest queue opciono) · [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) (`-NestQueueSmoke`) · [`atina-system/README.md`](../atina-system/README.md) | Dev-only `POST /internal/queue/smoke` — ponašanje, zaglavlja, env preduslovi (`REDIS_HOST`), `NODE_ENV` ograničenje, primeri payload-a / 200 odgovora |
| `docs/F4-6-UPLOAD-SPIKE.md` | 0 B | `Archive, ReparsePoint` | [`apps/omnigroup-web/src/app/dev/docs/page.tsx`](../apps/omnigroup-web/src/app/dev/docs/page.tsx) · [`FAZA-4-F4-6-NEXT.md`](./FAZA-4-F4-6-NEXT.md) (red 5: *Upload spike — dizajn jednog flow-a*) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (Talas 37) | F4-6 upload flow design (storage vs PG, presigned URL vs direktno, file size / MIME limits, dev-only Next route bez prod kredencijala u gitu) |
| `docs/FAZA-6-BACKLOG.md` | 0 B | `Archive, ReparsePoint` | [`apps/omnigroup-web/src/app/dev/docs/page.tsx`](../apps/omnigroup-web/src/app/dev/docs/page.tsx) (Talas 40) · [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (red #19) · [`MASTER-FINAL-ROADMAP.md`](./MASTER-FINAL-ROADMAP.md) · [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md) · [`MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md`](./MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md) | Faza 6 backlog (K8s + pun AI scope; gating uslovi; product sign-off prerequisites) |

**Detekcija:** iz korena repoa, PowerShell:

```powershell
Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Length -eq 0 -and $_.FullName -notmatch '\\node_modules\\|\\\.next\\|\\dist\\|\\\.git\\|\\coverage\\|\\build\\' } |
  Select-Object FullName, Length, @{n='Attrs';e={$_.Attributes}}
```

`.gitkeep` fajlovi (npr. `data/.gitkeep`, `sistem_naplate/pdfs/.gitkeep`) su **namerno prazni** (git keep) i nisu u ovom skupu.

---

## Korak 1 — Git history restore (preporučeno, deterministički)

Ako repo ima git history sa pre-dehydration verzijama, vlasnik može vratiti sadržaj komandom:

```powershell
# za svaki prazan fajl:
git log --all --diff-filter=D --summary -- atina-platform/atina/docs/operations/EMAIL-SURFACE.md
git log --all --oneline -- atina-platform/atina/docs/operations/EMAIL-SURFACE.md
# pronađi poslednji commit gde je fajl imao sadržaj, pa:
git show <commit-sha>:atina-platform/atina/docs/operations/EMAIL-SURFACE.md > atina-platform/atina/docs/operations/EMAIL-SURFACE.md
```

**Napomena:** kontejnerski git u repu (workspace nije inicijalizovan kao git repo u trenutku ove provere — vidi *user_info* zaglavlja u alat odzivu). Ako vlasnik radi na klonu sa GitHub-a, ovaj korak je 5-minutni posao po fajlu.

## Korak 2 — OneDrive cloud restore (ako Korak 1 ne uspe)

Ako fajlovi imaju cloud verziju u OneDrive (atribut `ReparsePoint` ukazuje na Files-On-Demand), klikni desnim tasterom u Explorer-u → **„Always keep on this device"** ili u OneDrive web interfejsu **Restore** iz **Recycle bin** (90 dana).

```powershell
# Verifikacija da li OneDrive ima cloud kopiju (i ako ima, attrib triger):
$path = 'docs/F4-6-UPLOAD-SPIKE.md'
attrib +U $path        # request unpinned (cloud dostupan)
Start-Sleep -Seconds 2
Get-Item $path | Select-Object Name, Length, Attributes
# Ako je Length > 0: cloud verzija postoji, lokalni fajl sada hidriran.
# Ako je Length 0 i Attrs još uvek ReparsePoint: cloud verzija je prazna ili ne postoji.
```

## Korak 3 — Ručna obnova iz konteksta (poslednja opcija)

Ako koraci 1 i 2 ne vrate sadržaj, vlasnik (uz pomoć agenta) može da rekonstruiše fajlove na osnovu konteksta iz tabele iznad. Predloženi templati:

### `EMAIL-SURFACE.md` (Atina email surface)

```markdown
# Email surface (Atina Node)

**Refs:** `nodemailer` zavisnost (vidi [`NPM-AUDIT-MONOREPO.md`](../../../docs/NPM-AUDIT-MONOREPO.md) — P1.A);
SMTP staging — [`SMTP-STAGING-RUNBOOK.md`](../../../docs/SMTP-STAGING-RUNBOOK.md);
release gate — [`release-gate-checklist.md`](./release-gate-checklist.md).

## Transporter
TODO[empty-doc-restore]: konfiguracija (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`),
TLS opcije, retry semantics.

## Email tipovi (po flow-u)
- registracija (verify link)
- password reset
- notifikacije (Forge events)

## Smoke putanja
`npm run smoke:auth` (Atina) pokriva login + email register flow.
```

### `LOGGING-NOTES.md` (Atina Winston)

```markdown
# Logging napomene (Atina Node — Winston)

**Refs:** [`OBSERVABILITY-RUNBOOK.md`](../../../docs/OBSERVABILITY-RUNBOOK.md);
[`SYSTEM-MAP.md`](../../../SYSTEM-MAP.md).

## Logger config
TODO[empty-doc-restore]: levels (info/warn/error), transports (console + file rotation),
format (JSON struktura sa `requestId`, `userId` redaction).

## Redacted fields
- `password`, `token`, `authorization`, `cookie`
- credit card / API key obrasci

## Request id
TODO[empty-doc-restore]: middleware (npm `cls-hooked` ili `AsyncLocalStorage`),
propagacija u nested service pozive.
```

### `QUEUE-SMOKE-DEV.md` (Nest queue smoke)

```markdown
# Queue smoke (dev-only)

**Refs:** [`scripts/smoke-stack.ps1`](../../scripts/smoke-stack.ps1) — `-NestQueueSmoke`;
[`scripts/README.md`](../../scripts/README.md) — *Nest queue (opciono)*.

## Endpoint
`POST /internal/queue/smoke` — **dev-only** (van produkcije, `NODE_ENV !== 'production'`).

## Headers
TODO[empty-doc-restore]: bilo koji X-Internal-Smoke ili API key zaglavlje
za dev gate; CORS off za internal rutu.

## Payload primer
`{ "queueName": "default", "jobName": "smoke", "data": { "ping": true } }`

## 200 odgovor
`{ "ok": true, "jobId": "<bull-job-id>", "queueName": "default" }`

## Preduslovi
- `REDIS_HOST` postavljen i Redis dostupan (BullMQ); kad nije, smoke-stack `-AllowNestRedisDown`.
```

### `F4-6-UPLOAD-SPIKE.md` (Faza 4-6 upload design)

```markdown
# F4-6 upload spike (dizajn dokument)

**Refs:** [`FAZA-4-F4-6-NEXT.md`](./FAZA-4-F4-6-NEXT.md) — red 5;
[`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) — Talas 37.

## Odluka 1: storage
TODO[empty-doc-restore]: PG large object vs S3-kompatibilan bucket vs lokalni filesystem.
Trade-off (cena / kompleksnost / backup story).

## Odluka 2: upload tok
- Direktno multipart u Next API rutu (dev) → privremeni storage
- Presigned URL (prod) — bucket kredencijali van repoa

## File limits
- Max veličina: TODO (npr. 10 MB)
- Dozvoljeni MIME: TODO (npr. `image/png`, `application/pdf`)

## Acceptance
MD sa odlukom + opciono jedna Next ruta koja u dev-u prihvata multipart
ali ne zahteva prave cloud kredencijale u gitu.
```

### `FAZA-6-BACKLOG.md` (Faza 6 — K8s / pun AI)

```markdown
# Faza 6 — backlog (K8s + pun AI)

**Status:** **`[ ]`** dok product ne potvrdi scope (vidi [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) red #19).

**Refs:** [`NIVO-3-VISION-K8S-AI.md`](./NIVO-3-VISION-K8S-AI.md);
[`MASTER-FINAL-ROADMAP.md`](./MASTER-FINAL-ROADMAP.md);
[`MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md`](./MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md).

## Gating uslovi (pre nego što išta ovo postane `[x]`)
- Product sign-off na scope
- Tim odluka o tooling-u (Helm vs Kustomize, AI provider sticky)
- Budžet za K8s cluster (managed vs self-hosted)

## Backlog (uređen, bez lažnih `[x]`)
TODO[empty-doc-restore]: lista konkretnih ticket-a (npr.
"K8s manifest za Atina deployment", "AI memory long-term store",
"observability stack — Prometheus + Grafana", itd.)

## Eksplicitno van scope-a
TODO[empty-doc-restore]: stvari koje NIKAD ne idu u Fazu 6
(npr. multi-region active-active, real-time video processing,
ako product ne uđe svesno u takav scope).
```

> Svi placeholderi nose `TODO[empty-doc-restore]` marker — isti obrazac kao **D.1 Iter 2** placeholderi (vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md)). Posle vlasnik-restore-a, marker se uklanja zajedno sa praznim TODO redovima.

---

## Sign-off blok

- [ ] **Korak 1:** Git history restore za sve fajlove (vlasnik) — komitovati kao zaseban PR `chore(docs): restore empty-docs from git history`
- [ ] **Korak 2 (ako 1 ne uspe):** OneDrive cloud restore + verifikacija `attrib +U` workflow-a
- [ ] **Korak 3 (ako 1 i 2 ne uspeju):** Ručna rekonstrukcija prema templatima iz ovog runbook-a sa `TODO[empty-doc-restore]` markerima — agent može pomoći ako vlasnik da minimalan kontekst po fajlu
- [ ] **Verifikacija:** ponovi detekciju (PowerShell snippet iz Snapshot sekcije) — očekuj 0 dehidriranih `*.md` fajlova; **`scripts/verify-monorepo.ps1`** PASS (Val 356+); doc gate ([`audit-doc-gate-references.ps1`](../scripts/audit-doc-gate-references.ps1)) PASS
- [ ] **Update:** [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md) (zapis sa Talas brojem), [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (Pass / Fail blok), [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md)

## Šta je već uradio agent

- **2026-05-14 (Val 355):** detektovao sve dehidrirane `.md` fajlove (5 fajlova, svi `Archive, ReparsePoint`, svi `Length=0`); pokušao `attrib +U/+P` i `Get-Content` da forsira OneDrive download — **nijedan se nije hidratirao**, što ukazuje da ili nema cloud verzije (Korak 2 N/A) ili treba git restore (Korak 1) ili ručna rekonstrukcija (Korak 3).
- **2026-05-14 (Val 355):** kreirao ovaj runbook + zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) + dodao u [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md). **Ne pomera Val broj** — runbook je dokumentacija, ne CI scope.
- **2026-05-14 (Val 355):** ispravio paralelni problem — [`apps/omnigroup-web` nije bio pokriven Dependabot-om](../.github/dependabot.yml); dodat npm ekosistem za `/apps/omnigroup-web` (weekly, limit 5, label `dependencies`). Direktno smanjuje vlasnik-napor oko `next` 14→16 P1.C upgrade-a iz [`NPM-AUDIT-MONOREPO.md`](./NPM-AUDIT-MONOREPO.md).

## Šta agent NE radi sam

- **Ne rekonstruiše content** za prazne `.md` fajlove (Korak 3) bez vlasnik-konteksta — risk od dezinformacije; templati iznad su skelet, ne kanonski sadržaj.
- **Ne pokreće `git restore`** ni druge git destruktivne komande (workspace u trenutku provere nije bio inicijalizovan kao git repo u shell-u).
- **Ne briše prazne fajlove** — možda su namerne placeholder-e koje vlasnik želi da popuni; brisanje bi pukle reference u 8+ drugih dokumenata (klik bi vraćao 404 umesto prazne stranice).

---

*Verzija: empty-docs runbook v1, 2026-05-14 (Val 355). Sledeći prolaz: posle vlasnik Korak 1/2/3 — verovatno u istom PR-u sa D.1 restore-om (oba su content-restore taska iz iste OneDrive Files-On-Demand putanje).*

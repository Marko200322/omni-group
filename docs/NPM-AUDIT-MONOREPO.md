# `npm audit` — monorepo presek (2026-05-14)

**Refs:**

- [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md) — kratki Nest-specifični izveštaj (postojeći)
- [`scripts/audit-npm-monorepo.ps1`](../scripts/audit-npm-monorepo.ps1) — **read-only runner** koji konsoliduje `npm audit` preko sva 3 paketa (Atina + Nest + omnigroup-web) iz jednog poziva (parametri `-OmitDev`, `-OutDir`, `-FailOnCritical`); **nije** deo CI gate-a (advisory-ji su warnings), ne pokreće `npm audit fix`. Sekcija u [`scripts/README.md`](../scripts/README.md) pokriva sve scenarije; ovaj runbook je njen kanonski parent u dokovima.
- [`scripts/verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md)) · [`scripts/smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Atina Node = **GET** `/health`) · bundled Atina **`npm run smoke:all`** u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*)
- [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **LATEST verify:** **Val 355** / 2026-05-14 (D.1 Iter 2 — vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md); ranije **Val 354** / 2026-05-13)
- [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **LATEST smoke** (**sekcija H**): **Val 351** / 2026-05-14
- **Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md)

> **Svrha dokumenta:** jedinstveni presek `npm audit` rezultata preko svih **3 Node paketa** u monorepu, uz preporučeni redosled koraka (P0 → P2) i jasno odvajanje **production-impact** od **dev-only** advisory-ja. Agent je zatvorio sve agent-safe `npm audit fix` (bez `--force`) prolaze; preostalo (`--force` upgrade-i) zahteva svesnu vlasnik-action sa changelog čitanjem i pun verify (Val 356+).

## Cilj

Cursor agent može autonomno da pokreće `npm audit` i `npm audit fix` (**bez `--force`**) u svakom paketu i da snimi nove brojke. **Ne sme** da pokreće `npm audit fix --force` jer svaki od njih radi major upgrade koji menja semantiku biblioteke (nodemailer 7→8, next 14→16, @nestjs/platform-express 10→11) — to su odluke vlasnika sa side-effect testovima na produkciju.

## Snapshot 2026-05-14

| Paket | Sve zavisnosti | Samo produkcija (`--omit=dev`) | Komanda iz korena paketa |
|-------|----------------|--------------------------------|---------------------------|
| `atina-platform/atina` (Atina Node SaaS) | **7 high** | **1 high** | `npm audit` / `npm audit --omit=dev` |
| `atina-system` (Nest) | **18 (4 low, 9 mod, 5 high)** | **5 (3 mod, 2 high)** | `npm audit` / `npm audit --omit=dev` (uz `npm run audit:level1`) |
| `apps/omnigroup-web` (Next 14) | **5 (1 mod, 4 high)** | **2 (1 mod, 1 high)** | `npm audit` / `npm audit --omit=dev` |
| **Ukupno** | **30** advisory-ja | **8** prod advisory-ja | — |

**Tumačenje:** ~73% advisory-ja je **dev-only** (test runneri, build alati, schematics CLI, eslint chain). **Stvaran produkcijski rizik** je 8 advisory-ja u 3 paketa, svi sa breaking-change rezolucijom.

**Konsolidovani prolaz iz korena:** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-npm-monorepo.ps1 -OmitDev` reprodukuje brojeve iznad u jednom izveštaju (oba moda, plus `-OutDir evidence/npm-audit` za JSON snapshot po paketu). Skripta je **read-only** — ne pokreće `npm audit fix`. Detalji: [`scripts/README.md`](../scripts/README.md) — sekcija *`audit-npm-monorepo.ps1` — read-only `npm audit`*.

---

## A. `atina-platform/atina` (Atina Node SaaS — produkcioni Node API)

### Brojke
- `npm audit`: **7 high** (svi u dev / transitivno kroz eslint chain + `nodemailer`)
- `npm audit --omit=dev`: **1 high** (`nodemailer`)

### Top advisory (production-impact)

1. **`nodemailer` `<= 8.0.4`** (high) — *production* dependency (SMTP transport). Četiri advisory-ja:
   - GHSA-mm7p-fcc7-pg87 — Email to unintended domain (Interpretation Conflict)
   - GHSA-rcmh-qjqh-p98v — addressparser DoS (recursive calls)
   - GHSA-c7w3-x93f-qmm8 — SMTP command injection (`envelope.size` unsanitized)
   - GHSA-vvjj-xcjg-gr5g — SMTP command injection (CRLF in Transport `name`/EHLO/HELO)

   **Fix:** `npm audit fix --force` instalira `nodemailer@8.0.7` (major bump 7 → 8). API je sličan ali **proveriti** sve `transporter.sendMail({ envelope })` pozive i SMTP transport custom `name`-ove — ne forsirati naslepo na `main`.

### Top advisory (dev-only)

2. **`@typescript-eslint/*` chain** (high) — `parser`, `type-utils`, `utils`, `eslint-plugin` `6.16.0 - 7.5.0`. Transitivni ReDoS / parsing problemi. Fix: bump celog `@typescript-eslint/*` lanca na 8.x; **ne menja runtime ponašanje** Atina API-ja, samo lint output.

### Preporučena akcija (vlasnik)

- **P1 (production-impact):** zaseban PR `feat(deps): nodemailer 7 → 8 + transporter smoke`. Koraci:
  1. Pročitati [Nodemailer 8.0 changelog](https://nodemailer.com/about/changelog/).
  2. `npm i nodemailer@8 --save` u `atina-platform/atina`.
  3. Lokalan **`npm run smoke:all`** + **`npm run smoke:auth`** (formalni Atina release gate; vidi [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) — proveriti SMTP path-ove (registracija, password reset, notifikacije).
  4. **Pun verify-monorepo.ps1 PASS** (Val 356+) pre merge-a.
- **P2 (dev-only):** `@typescript-eslint/*` na 8.x kad se napravi koordinisan `eslint`-9 prelazak (zajedno sa Nest i Omnigroup-web).

---

## B. `atina-system` (Nest microservice)

### Brojke
- `npm audit`: **18** (4 low, 9 moderate, 5 high)
- `npm audit --omit=dev`: **5** (3 moderate, 2 high)

### Top advisory (production-impact)

Vidi i [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md) (već postojeći Nest-specifičan izveštaj — sa istim **`Python (Doslednost dok + pytest)`** required check imenom u [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md) i istom `verify-monorepo` putanjom).

1. **`multer`** (high, transitivno kroz `@nestjs/platform-express`) — više DoS advisory-ja. Fix: `@nestjs/platform-express@11.1.20` = major Nest upgrade.
2. **`@nestjs/core`** (moderate) — output neutralization GHSA-36xv-jgw5-4q75. Aligned bump celog `@nestjs/*` mono-line.
3. **`file-type`** (moderate, kroz `@nestjs/common`) — ZIP/ASF parser DoS. Adresabilno aligned `@nestjs/common` bump.
4. **`uuid`** (moderate) — `bullmq`, `typeorm` nested zavisnosti. `--force` instalira `uuid@14`, kida peer očekivanja (peer dep za `bullmq` / `typeorm`).
5. **`lodash`** (moderate, kroz `@nestjs/config`) — code injection. Često rešivo bez `--force` posle `@nestjs/config` bump-a.

### Top advisory (dev-only)

6. **`webpack` 5.49.0 - 5.104.0** (high) — kroz `@nestjs/cli/node_modules/webpack`. allowedUris bypass (SSRF). **Fix dostupan kroz `npm audit fix`** (bez `--force`) — agent ovo može zatvoriti, ali samo unutar dev tree-a (ne menja Nest runtime).
7. **`tmp` <=0.2.3 + `external-editor` + `inquirer`** chain (low, dev) — symbolic link write. Fix kroz `npm audit fix`.
8. **`picomatch`** (moderate, dev) — ReDoS extglob quantifiers. Fix podrazumeva `@nestjs/schematics@11.1.0` major bump (samo schematics CLI; ne utiče na build).

### Preporučena akcija (vlasnik)

- **P0 (sigurni dev fix-evi, agent-safe ako se pokrene posle pun verify-a):** `cd atina-system; npm audit fix` (bez `--force`) — pokušati zatvaranje `webpack`, `tmp`, `external-editor`, `inquirer` lanca. Posle: `npm run verify:n1` (build + unit). **Napomena:** prošli pokušaj na 2026-05-13 dao **18 → 18** (sve ostalo je iza `--force`-a) — ovo treba ponovljeno proveriti pre PR-a.
- **P1 (production-impact, koordinisan):** PR `feat(deps): @nestjs/* aligned bump → 11.x` koji pokriva `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/schematics`. **Ručno changelog čitanje** (decorator semantika, `Reflector` API, `useGlobalGuards`, multer disk vs memory storage). Pun **`npm run verify:ci`** + e2e (10/10) PASS pre merge-a.
- **P2 (dev-only):** `picomatch` / `webpack` ostaci kroz aligned bump iznad.

---

## C. `apps/omnigroup-web` (Next 14 marketing site + interni hub)

### Brojke
- `npm audit`: **5** (1 moderate, 4 high)
- `npm audit --omit=dev`: **2** (1 moderate, 1 high)

### Top advisory (production-impact)

1. **`next` 14.2.35** (high) — **14 advisory-ja** (svi DoS / cache poisoning / SSRF / XSS):
   - GHSA-9g9p-9gw9-jx7f — Image Optimizer remotePatterns DoS
   - GHSA-h25m-26qc-wcjf — HTTP request deserialization DoS (insecure RSC)
   - GHSA-ggv3-7p47-pfv8 — HTTP request smuggling u `rewrites`
   - GHSA-3x4c-7xq6-9pq8 — Unbounded `next/image` disk cache rast
   - GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj — DoS Server Components
   - GHSA-ffhc-5mcf-pf4q — XSS u App Router uz CSP nonces
   - GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7 — RSC cache poisoning
   - GHSA-gx5p-jg67-6x7h — XSS `beforeInteractive` scripts
   - GHSA-h64f-5h5j-jqjh — Image Optimization API DoS
   - GHSA-c4j6-fc7j-m34r — SSRF (WebSocket upgrades)
   - GHSA-36qx-fr4f-26g5 — Middleware/Proxy bypass (Pages Router i18n)
   - GHSA-3g8h-86w9-wvmq — Middleware/Proxy redirect cache poisoning

   **Fix:** `next@16.2.6` (major 14 → 16, dva major bumpa). **Ozbiljan opseg** — Next 15 i 16 menjaju default behavior za async params, fetch caching (`fetch` po defaultu nije keširan u Next 15+), App Router conventions, Image API. Sav `apps/omnigroup-web` kod treba pregledati.

2. **`postcss`** (moderate, transitivno kroz `next`) — XSS via Unescaped `</style>` u CSS Stringify Output. Resolve sa next 14 → 16 bump.

### Trenutni rizik

`apps/omnigroup-web` **ne stoji u javnoj produkciji** — to je marketing / interni dok hub. Najveći rizik je `next/image` DoS i Server Components RSC cache poisoning **ako i kad** se deployuje. Pre produkcionog deploy-a ovo MORA biti rešeno; lokalni dev nije eksponiran.

### Preporučena akcija (vlasnik)

- **P0 (vezano za D.1):** vlasnik prvo vraća pravi UI iz Koraka 1/2 [`OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](./OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md) (D.1 placeholder Iter 2 sad pokriva F4-2 acceptance — vidi [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md)).
- **P1 (Next 14 → 16):** zaseban PR `feat(omnigroup-web): next 14 → 16` posle D.1 restore-a. Proveriti:
  1. Async `params`/`searchParams` (Next 15+ menja `params` u Promise<...>).
  2. Fetch caching default (Next 15+ koristi `cache: 'no-store'` po defaultu).
  3. `<Image>` config — `images.remotePatterns` strožija validacija.
  4. App Router `layout.tsx` / `loading.tsx` semantika.
  5. `npm run build` PASS, `npm run lint` PASS.
  6. Pun `verify-monorepo.ps1` (job **`omnigroup-web`** unutra) PASS (Val 357+).
- **P2:** Sva ostala dev-only iz Atina/Nest (`@typescript-eslint/*`, `webpack`, `picomatch`).

---

## Predloženi redosled vlasnik-akcija

| Korak | Vlasnik | Paket | Komentar |
|-------|---------|-------|----------|
| **D.1 restore** | Vlasnik | `apps/omnigroup-web` | Vrati pravi UI iz OneDrive cloud-a / Git remote-a → Val 356 PASS |
| **P1.A** | Vlasnik | `atina-platform/atina` | `nodemailer` 7 → 8 (jedan PR, mali blast radius) → Val 357 PASS |
| **P1.B** | Vlasnik | `atina-system` | `@nestjs/*` aligned 11.x bump (najveći blast radius — multer, file-type, lodash, core) → Val 358 PASS |
| **P1.C** | Vlasnik | `apps/omnigroup-web` | `next` 14 → 16 (posle D.1 restore-a) → Val 359 PASS |
| **P2** | Vlasnik / agent | sve | dev-only ostatak (`@typescript-eslint/*` lanac, `webpack`, `picomatch`) — često se zatvara nuspojavom P1 PR-ova |

Svaki P1 PR ide sa: aktualizovan ovaj fajl (nove brojke posle bump-a), ažuriran [`atina-system/docs/NPM-AUDIT-NIVO1.md`](../atina-system/docs/NPM-AUDIT-NIVO1.md) ako je Nest, novi Val u [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md), zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md), red u [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).

## Šta je već uradio agent

- **2026-05-13 (Val 354):** `npm audit fix` (bez `--force`) u `atina-platform/atina` → **11 → 7** advisory-ja (4 fixed). Atina `test:ci` PASS posle fix-a.
- **2026-05-13:** pokušaj `npm audit fix` u `atina-system` → **18 → 18** (sve preostalo zahteva `--force`).
- **2026-05-14 (post-Val 355):** ponovljen `npm audit fix` (bez `--force`) sa backup-om `package-lock.json`:
  - `atina-system` → **18 → 18** (potvrđeno: nema ne-`--force` rezolucije; backup obrisan, lock netaknut)
  - `apps/omnigroup-web` (`--dry-run`) → **5 → 5** (sve advisory-ji vise iza `next@16.2.6` `--force` rezolucije)
  - `atina-platform/atina` (`--dry-run`) → **blokirano EBADENGINE** (Node 24 vs `engines.node: ">=20 <21"` u `package.json`); `npm audit` (read-only) i pun verify-monorepo prolaze, ali svaki `audit fix` koji instalira pakete pada na engine validaciji. **Workaround:** vlasnik koristi Node 20.x lokalno za bilo koji future `audit fix` u Atini, ili dodaje `engine-strict=false` u `.npmrc` ako svesno odluči (CI matrica i dalje koristi Node 20).
- **2026-05-14 (Val 355):** sav `verify-monorepo.ps1` PASS uprkos 30 advisory-ja (svi su `audit` warning, ne build/test failure). Konsolidovani audit zapis ovde + zapis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) (audit snapshot blok).

## Sledeći agent-safe koraci (ako vlasnik traži)

- **Već dostupno (Val 355):** [`scripts/audit-npm-monorepo.ps1`](../scripts/audit-npm-monorepo.ps1) — read-only runner koji pokriva sva 3 paketa iz jednog poziva (modovi: sve / `--omit=dev` / JSON snapshot u `-OutDir`); `Get-Help .\scripts\audit-npm-monorepo.ps1 -Full` u PowerShell-u, sekcija u [`scripts/README.md`](../scripts/README.md).
- Pokrenuti **`audit-npm-monorepo.ps1 -OmitDev -OutDir evidence/npm-audit`** za machine-readable JSON snapshot per-paket (compliance trag); folder se kreira automatski. Skripta nije gate (advisory-ji su warnings) i ne pokreće `npm audit fix`.
- Periodično (~mesečno) ponavljati audit snapshot — registry se ažurira, nove advisory-je / fix-evi mogu pojaviti bez ručnog upgrade-a.

## Sledeći non-agent-safe koraci (vlasnik)

Vidi tabelu **Predloženi redosled vlasnik-akcija** iznad. **Nijedan `--force` fix nije pokrenut od strane agenta.** Sve P1 PR-ove pokreće vlasnik svesno.

---

*Verzija: monorepo NPM audit v1, 2026-05-14. Sledeći audit: posle prvog P1 PR-a (verovatno P1.A — nodemailer u Atini).*

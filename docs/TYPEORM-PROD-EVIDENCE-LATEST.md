# Evidencija — CEO sekcija C (Nest / TypeORM produkcija)

**Poslednji pregled (2026-08-04, gap-scan 10 agenata):** Nest **nije** u live Docker stacku (`docker-compose.prod.yml` = web + atina-api + postgres + redis + caddy). Live API = Atina Node Express; Nest migracije **ne smeju** ići na `atina_saas_db`.

**Status:** **N/A do Nest u prod** — CEO C zatvoren kao scope reduction (Path A). Full Path B (poseban Nest Postgres + `TYPEORM_SYNC=false` + migracije) ostaje u backlogu REDOM #9.

**Odluka:** Live produkt ne deploy-uje Nest. Stavka važi tek kad Nest uđe u `docker-compose.prod.yml` + dedicated DB. Vidi [`VLASNIK-DOSTAVA.md`](./VLASNIK-DOSTAVA.md) §17 · gap: `docs/evidence/gap-scan-2026-08-04/Nest.md`.

**Sign-off N/A (2026-08-04):**

| Korak | PASS / FAIL / N/A | Napomena |
|-------|-------------------|----------|
| Pre-deploy: prod `.env` ima `TYPEORM_SYNC=false` | N/A | Nest nije na VPS |
| Backup / migracije / health Nest | N/A | Live DB = Atina Node `schema_migrations` |
| Repo gate `verify:ci` | PASS | CI monorepo + lokalni Val 360 |

**Ukupno:** N/A (Nest out of scope for omnigrouptech.com) — re-open kad Nest + Python/Astra uđu u prod (ADMIN #9).

---

**Arhiva runbooka ispod** — koristi samo ako se bira Path B (Nest u prod).

**Stari status (2026-05-13):** _čeka izvršenje na produkcijskoj bazi_ (zamenjeno N/A 2026-08-04)

**Runbook (detalji):** [`atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md) (sekcija *Evidencija za CEO sekciju C*)  
**Migration plan / index:** [`atina-system/docs/MIGRATIONS-PLAN.md`](../atina-system/docs/MIGRATIONS-PLAN.md)

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

## Šta vlasnik radi (15–60 min, zavisno od toga koliko je migracija)

> **Preduslov:** Imaš pristup pravoj produkcijskoj Postgres bazi i mogućnost da deployuješ novi `.env` na server gde Nest sluša.

### Korak 1 — Pripremi produkcijski `.env` (na serveru, NE u repou)

Minimalni blok (zameni placeholdere; **nikada** ne commituj ovo u Git):

```bash
NODE_ENV=production

POSTGRES_HOST=<host-managed-baze>      # npr. atina-prod.cluster-abc.eu-central-1.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_USER=<prod-user>
POSTGRES_PASSWORD=<prod-pass>
POSTGRES_DB=<prod-db-ime>
POSTGRES_SSL=true                       # za managed DB (RDS, Supabase, Neon, ...). Lokalni Docker: false.
POSTGRES_SSL_REJECT_UNAUTHORIZED=true   # postavi false samo ako znaš zašto

# OBAVEZNO za prod
TYPEORM_SYNC=false                      # KLJUČNA stavka CEO sekcije C
TYPEORM_LOG=false                       # uključi privremeno samo za incident debug

JWT_SECRET=<min-32-karaktera-novi-random>
CORS_ORIGINS=https://<tvoj-prod-domen>

PORT=3000
PHASE=v1
```

Šablon: [`atina-system/.env.example`](../atina-system/.env.example).

### Korak 2 — Backup produkcijske baze pre migracije

Detaljan runbook (sa AWS RDS / managed primerima): [`atina-platform/atina/docs/operations/db-backup-restore-runbook.md`](../atina-platform/atina/docs/operations/db-backup-restore-runbook.md).

**Brza varijanta (`pg_dump`):**

```bash
# Na serveru ili lokalnoj mašini sa pristupom prod bazi:
PGPASSWORD=<prod-pass> pg_dump \
  -h <prod-host> -U <prod-user> -d <prod-db-ime> \
  -F c -Z 9 \
  -f atina-system-prod-$(date +%Y%m%d-%H%M).dump
```

Snimi negde van git repoa (S3 / dedicated backup bucket / off-machine).

### Korak 3 — Pregled migracija pre primene

Iz `atina-system/`:

```bash
# Build
npm ci
npm run build

# Pregled poslednjih migracija u repou
ls -la dist/database/migrations/

# (opciono) Provera koje su migracije već primenjene na prod DB:
PGPASSWORD=<prod-pass> psql \
  -h <prod-host> -U <prod-user> -d <prod-db-ime> \
  -c "SELECT id, timestamp, name FROM migrations ORDER BY id;"
```

> Ako tabela `migrations` ne postoji ili je prazna a baza ima već šemu (npr. raniji `synchronize=true` rad), **STOP** — ne pokreći `migration:run`. Konsultuj [`MIGRATIONS-PLAN.md`](../atina-system/docs/MIGRATIONS-PLAN.md) za reset / baselining.

### Korak 4 — Pokreni migracije na prod bazi

Dva načina (izaberi po deploy procesu):

**A) Iz CI/deploy pipeline-a (preporučeno):**

```bash
# U deploy job-u, sa prod env-om
npm ci
npm run build
npm run migration:run     # koristi dist/database/data-source.js + .env vrednosti
```

**B) Iz lokalne shell sesije sa prod credentials u env-u (ad-hoc):**

```powershell
# PowerShell (Windows) — postavi prod env za ovu sesiju
$env:NODE_ENV='production'
$env:POSTGRES_HOST='<prod-host>'
$env:POSTGRES_PORT='5432'
$env:POSTGRES_USER='<prod-user>'
$env:POSTGRES_PASSWORD='<prod-pass>'
$env:POSTGRES_DB='<prod-db-ime>'
$env:POSTGRES_SSL='true'
$env:TYPEORM_SYNC='false'

Set-Location atina-system
npm ci
npm run build
npm run migration:run
```

```bash
# Bash / WSL
export NODE_ENV=production
export POSTGRES_HOST=<prod-host>
export POSTGRES_PORT=5432
export POSTGRES_USER=<prod-user>
export POSTGRES_PASSWORD=<prod-pass>
export POSTGRES_DB=<prod-db-ime>
export POSTGRES_SSL=true
export TYPEORM_SYNC=false

cd atina-system
npm ci
npm run build
npm run migration:run
```

> **Očekivani izlaz:** `Migration <Ime>1234567890123 has been executed successfully.` za svaku ne-primenjenu migraciju. Ako je sve već primenjeno: `No migrations are pending`.

### Korak 5 — Verifikacija posle migracije

```bash
# 1) Lista primenjenih migracija u DB-u
PGPASSWORD=<prod-pass> psql \
  -h <prod-host> -U <prod-user> -d <prod-db-ime> \
  -c "SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 10;"

# 2) Da li je TYPEORM_SYNC zaista false u procesu
#    (provera kroz health endpoint ili lozinkom-zaštićen admin endpoint)
curl -s https://<prod-host>:3000/health
```

### Korak 6 — Deploy nove aplikacije sa istim env-om

Pokreni novi container/process koji koristi **isti `.env`** sa **`TYPEORM_SYNC=false`**.  
Smoke posle: `GET /health` mora vratiti `ok=true`.

### Korak 7 — Ako nešto pukne — rollback

Detaljno: [`atina-platform/atina/docs/operations/deploy-rollback-checklist.md`](../atina-platform/atina/docs/operations/deploy-rollback-checklist.md) i [`atina-platform/atina/docs/operations/db-rollback-drill-runbook.md`](../atina-platform/atina/docs/operations/db-rollback-drill-runbook.md).

- **Kod**: vrati prethodni release tag.
- **Šema (tested path)**: `npm run migration:revert` (povraćaj poslednje migracije, ako je `down()` napisan i siguran), **ili** restore iz `pg_dump` backup-a iz Koraka 2.
- **Nikada** ne ostavljaj `TYPEORM_SYNC=true` u prod env-u "za svaki slučaj" — to **odmah ruši** CEO sekciju C.

---

## Sign-off blok (popuni)

**Datum deploya / migracije:** _(YYYY-MM-DD)_  
**Vlasnik (DevOps / DBA):** _(ime)_  
**Okruženje:** produkcija — host: _(redacted)_, baza: _(ime, bez lozinke)_  
**Prethodni backup:** _(filename / S3 ključ; bez kredencijala)_

| Korak | PASS / FAIL / N/A | Napomena (kratko) |
|-------|------------------|-------------------|
| Pre-deploy: prod `.env` ima **`TYPEORM_SYNC=false`** | | |
| Pre-deploy: backup baze uzet (Korak 2) | | _(filename / S3 link bez tajni)_ |
| Migracije pregledane (Korak 3 — diff vs prošli release) | | |
| `npm run migration:run` izvršen — bez grešaka | | _(broj primenjenih migracija)_ |
| `SELECT … FROM migrations` posle: poslednja revizija odgovara repo-u | | |
| Aplikacija podignuta sa novim env-om, `GET /health` = `ok=true` | | |
| Smoke osnovnih ruta (login, jedan modul) — PASS | | |

**Ukupno:** Pass / Fail — _(jedna rečenica)_

**Kad je Pass:** stavi **`[x]`** na stavku **CEO sekcije C** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) (red 95 — *„Produkcija: u pravom `.env` `TYPEORM_SYNC=false` + migracije primljene na produkcijskoj bazi…“*) i po želji ažuriraj red u [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) (TypeORM — **CEO sekcija C**).

---

## Zašto baš ovako (kratak rezime)

- `synchronize=true` je opasno u produkciji jer TypeORM može da menja šemu na osnovu trenutnih TS modela — bilo koji slučajan refaktor uvodi destruktivne promene bez review-a.
- Migracije čuvaju trag u tabeli `migrations` — to je auditabilan red.
- `POSTGRES_SSL=true` + `POSTGRES_SSL_REJECT_UNAUTHORIZED=true` su default-i koje očekuje [`postgres-ssl.util.ts`](../atina-system/src/database/postgres-ssl.util.ts). Lokalni Docker ne treba TLS.

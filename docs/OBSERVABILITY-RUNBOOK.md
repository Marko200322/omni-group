# Observability — minimalni runbook (repo)

**Svrha:** jedna stranica za **MASTER** red #18 i [`COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md`](./COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md) odjeljak **4.3** — šta postoji u monorepu (bez pretpostavke o konkretnom cloud provajderu).

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

**Python (Astra) — docker + `GET /api/status`:** [`PYTHON-ASTRA-OPS.md`](./PYTHON-ASTRA-OPS.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## 1. Health (šta proveriti)

| Stack | URL / ruta | Napomena |
|-------|------------|----------|
| **Python (Astra)** | `GET {AstraBase}/api/status` | Podrazumevano `http://127.0.0.1:8080` — vidi [`smoke-stack.ps1`](../scripts/smoke-stack.ps1); JSON mora imati bar `remaining_rsd`. |
| **Nest (`atina-system`)** | `GET {NestBase}/` | Podrazumevano `http://127.0.0.1:3001` — očekuje se JSON sa `ok: true` i `name: "atina-system"`. Isti servis izlaže i **`GET /health`** (vidi [`atina-system/README.md`](../atina-system/README.md)). |
| **Node (Atina SaaS)** | `GET {base}/health` | Javni ping (npr. `http://127.0.0.1:3000/health`). Tri-stub [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) šalje samo ovo kada je Node uključen (`-SkipNode:$false` ili `-AtinaNodeBase`). Dublji prolaz: **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*). |

**Admin / poslovni readout (Node, autentifikacija):** npr. `GET /api/v1/admin/overview` i workflow statistika — [`atina-platform/atina/README.md`](../atina-platform/atina/README.md), [`atina-platform/atina/CONTRIBUTING.md`](../atina-platform/atina/CONTRIBUTING.md).

**Nest queue (samo dev/staging):** opciono [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) `-NestQueueSmoke` — detalji u zaglavlju skripte i [`atina-system/README.md`](../atina-system/README.md); za kompletan **`POST /internal/queue/smoke`** (okruženje, zaglavlja, rate limiti) vidi [`atina-system/docs/QUEUE-SMOKE-DEV.md`](../atina-system/docs/QUEUE-SMOKE-DEV.md).

---

## 2. Logovi (šta raditi u ovom repou)

- **Lokalno / VM / bilo koji host sa Dockerom:** `docker compose logs` (ili `docker compose logs -f <servis>`) za root compose i za `atina-platform/atina` po potrebi. Nema obavezne centralizacije u kodu — ako kasnije uvedete agregator (self-hosted ili managed), usmerite **stdout/stderr** kontejnera tamo; ne mešajte tajne u log poruke.
- **Strukturisani logovi:** cilj u produkciji je jedan format po servisu (npr. JSON linije) da se mogu filtrirati; implementacija je u aplikacionom kodu — ovaj runbook ne nameće biblioteku.
- **Greške pri gašenju testova (Nest e2e):** poznata briga sa cron-om — [`atina-system/README.md`](../atina-system/README.md) (*E2E*).

### Structured logs / correlation

- **Atina Node — request id:** prosledi `X-Request-ID` kroz edge/proxy; ako nedostaje, middleware dodeljuje vrednost — [`atina-platform/atina/src/core/CoreEngine.ts`](../atina-platform/atina/src/core/CoreEngine.ts).
- **Atina Node — Winston (JSON jedna linija):** npr. `winston.format.combine(winston.format.timestamp(), winston.format.json())` (file transport već koristi `winston.format.json()` u [`atina-platform/atina/src/utils/logger.ts`](../atina-platform/atina/src/utils/logger.ts)).

---

## 3. Tajne i ko šta radi

| Tema | Ko | Gde je istina u repou |
|------|-----|------------------------|
| Šabloni env imena (bez vrednosti u gitu) | Dev + vlasnik za prod vrednosti | [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example), [`atina-system/.env.example`](../atina-system/.env.example), [`tools/youtube-pipeline/.env.example`](../tools/youtube-pipeline/.env.example), [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example) · matrica: [`SECRETS-MATRIX.md`](./SECRETS-MATRIX.md). |
| Checklista „samo vlasnik“ | Vlasnik | [`VLASNIK-ZAVRSAVA.md`](./VLASNIK-ZAVRSAVA.md) · [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md). |
| Deljeni vault (Forge ↔ Python) | Tim + vlasnik za deploy | [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md), [`VAULT-B-EVIDENCE-LATEST.md`](./VAULT-B-EVIDENCE-LATEST.md). |
| Nest DB / TypeORM u produkciji | Vlasnik | [`atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md`](../atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md). |

**Pravilo:** nove tajne samo u **`.env` / secret store** na okruženju — ne u repou, ne u prompt fajlovima.

---

## 4. Brzi ritual posle deploy-a (lokal ili staging)

1. [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Astra + Nest; po želji Node).
2. Za pun Atina Node prolaz: `cd atina-platform/atina` → `npm run smoke:all` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md).

Evidencija smoke-a: [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md).

# Python stack (Astra) — brza referenca

**Svrha:** jedna stranica za podizanje Python dela monorepa iz **korena repoa** i proveru da Astra živi.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Podizanje (Docker)

Iz korena klona (`<koren-klona-omni-group>`):

```bash
docker compose up --build
```

Servisi: `forge`, `atina` (worker), `astra` (Flask API/UI). Astra mapira host **`8080`** → kontejner (vidi root [`docker-compose.yml`](../docker-compose.yml)).

---

## Health

| Šta | Kako |
|-----|------|
| **Astra** | `GET {AstraBase}/api/status` — podrazumevano `http://127.0.0.1:8080/api/status` |

Očekuje se JSON sa bar poljem `remaining_rsd` (isti kriterijum kao u [`smoke-stack.ps1`](../scripts/smoke-stack.ps1)).

---

## Smoke (više stackova)

**Tri-stub napomena:** [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) radi HTTP probe za Astra (`GET /api/status`), Nest, i opciono Atina Node (`GET /health` kada nije preskočen).

Dublji prolaz za **Atina Node** (bundled HTTP, login / Forge / admin): u `atina-platform/atina` pokreni **`npm run smoke:all`** (**`smoke:all`**). Formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

---

## Povezano

- Observability (health / logovi): [`OBSERVABILITY-RUNBOOK.md`](./OBSERVABILITY-RUNBOOK.md)
- Širi kontekst smoke-a i evidencije: [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md), par sa dry-run šablonom [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md)

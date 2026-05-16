# Evidencija — CEO sekcija B (deljeni vault Python ↔ Node Forge)

*(Kopiraj blok; ne commit-uj stvarne tajne ili punu produkcijsku putanju ako politika zabranjuje.)*

---

**Datum:** _(YYYY-MM-DD)_  
**Vlasnik:** _(ime / tim)_  
**Okruženje:** _(lokalno / staging)_

**Konfiguracija (kratko):**

- Root: `docker-compose.override.yml` iz [`docker-compose.override.vault-bindmount.example.yml`](../docker-compose.override.vault-bindmount.example.yml) — da / ne  
- Node: `atina-platform/atina/docker-compose.override.yml` iz [`docker-compose.override.forge-vault-bindmount.example.yml`](../atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml) — da / ne  
- Isti host folder za `vault.db`: da / ne _(npr. `omni-shared-vault` u korenu repoa)_

**Provera:**

- `omni-shared-vault\vault.db` postoji nakon rada Forge-a: da / ne  
- Node `app` kontejner podignut sa `FORGE_VAULT_PATH=/data/vault.db`: da / ne  
- Opciono: SQLite read-only upit izvršen: da / ne / N/A  

**Pass / Fail:** _(Pass / Fail + jedna rečenica)_

**Link na runbook:** [`VAULT-B-INTEGRATED-RUNBOOK.md`](./VAULT-B-INTEGRATED-RUNBOOK.md)

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

**Monorepo evidencija (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).

---

*Posle **Pass**, vlasnik može u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) **u CEO sekciji B** staviti **`[x]`** i kratak link na ovaj fajl (ili punu kopiju u `docs/` sa fiksnim imenom npr. `VAULT-B-EVIDENCE-LATEST.md`).*

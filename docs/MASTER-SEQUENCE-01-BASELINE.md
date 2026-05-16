# Master sekvenca **01** — bazna linija (mašina + repo)

**Prethodno:** — · **Sledeće:** [`MASTER-SEQUENCE-02-GATE-GREEN.md`](./MASTER-SEQUENCE-02-GATE-GREEN.md)  
**Hub:** [`MASTER-SEQUENCE-HUB.md`](./MASTER-SEQUENCE-HUB.md)

## Cilj

Ista radna stanica može **pouzdano** da pokrene Python testove i (po izboru) delove Node/Nest stacka bez „prljave“ baze koja kvari migracije.

## Checklist

- [ ] **Git klon** na putanji van problematičnog sync-a (preporuka u [`NIVO-1-START.md`](../NIVO-1-START.md): Nest `npm ci` van OneDrive ako treba).
- [ ] **Alati:** Node 20 (vidi `.nvmrc` gde postoji), Docker Desktop (ako koristiš compose), PowerShell 5.1+ ili 7+, Python 3.12 za koren repoa.
- [ ] **Python:** `pip install -r requirements.txt` u korenu; `python -m pytest -q` — 11+ testova zeleno ([`tests/README.md`](../tests/README.md)).
- [ ] **Nest Postgres za `verify:ci`:** odvojena baza ili čista šema — ako vidiš `relation "users" already exists` a `migrations` je prazna, uradi reset šeme ili drugi `POSTGRES_PORT` prema [`scripts/README.md`](../scripts/README.md) (**Port mismatch**).
- [ ] **Brzi Nest bez DB:** `cd atina-system` → `npm ci` → `npm run verify:n1` (samo build + unit).
- [ ] **Atina Node (opciono):** `cd atina-platform/atina` → `npm ci` → `npm run test:ci` (ili bar `npm run build`).
- [ ] **Next (opciono):** `cd apps/omnigroup-web` → `npm ci` → `npm run build`.

## Dokaz (minimalno)

- Snimak: pytest PASS; opciono screenshot ili jedna linija u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) pod „Baseline 01“.

## Veze

- [`NIVO-1-START.md`](../NIVO-1-START.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`atina-system/README.md`](../atina-system/README.md)

---

*Lista 01 — bazna linija.*

# CEO sekcija B — integrisani prolaz: deljeni SQLite vault (Python ↔ Node Forge)

**Cilj:** jedan `vault.db` koji koriste **root Python** (`VAULT_PATH`) i **Atina Node SaaS** (`FORGE_VAULT_PATH`). **Nest** ovaj fajl ne koristi — vidi [`VAULT-ALIGNMENT-NOTES.md`](./VAULT-ALIGNMENT-NOTES.md).

**Matrica:** stavka **u CEO sekciji B** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) ostaje **`[ ]`** dok vlasnik ne zabeleži prolaz u šablonu ispod (bez lažnih potpisa).

---

## 1. Priprema (jednokratno po mašini)

1. U **korenu repoa** napravi folder za deljeni fajl (nije u gitu — vidi root `.gitignore`):
   ```powershell
   Set-Location "…\omni group"
   New-Item -ItemType Directory -Force -Path ".\omni-shared-vault" | Out-Null
   ```
2. Root Python stack — kopiraj primer u aktivni override:
   - Iz [`docker-compose.override.vault-bindmount.example.yml`](../docker-compose.override.vault-bindmount.example.yml) → `docker-compose.override.yml` (koren repoa).
3. Node SaaS — kopiraj primer:
   - Iz [`atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml`](../atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml) → `atina-platform/atina/docker-compose.override.yml`.

**Upozorenje:** SQLite — izbegni **dva procesa koji istovremeno pišu** u isti fajl. Za pravu konkurentnost koristi drugačiju strategiju (npr. jedan writer, ili migracija sa SQLite).

---

## 2. Redosled podizanja (preporuka)

1. Zaustavi stare kontejnere koji još drže stari `vault_data` volumen ako menjaš strategiju (`docker compose down` u korenu / u `atina-platform/atina` po potrebi).
2. **Root:** `docker compose up -d --build` — Forge će kreirati `/data/vault.db` unutar `omni-shared-vault\vault.db` na hostu.
3. **Node:** `cd atina-platform\atina` → `docker compose up -d --build` (override montira isti folder na `/data` u `app` kontejneru).

---

## 3. Brza provera (bez osetljivih podataka)

Na hostu (Windows, iz korena repoa):

```powershell
$db = Join-Path (Get-Location) "omni-shared-vault\vault.db"
Test-Path $db   # mora biti True nakon što je Forge/Astra radili
```

Opciono read-only SQLite (ako imaš `sqlite3` u PATH):

```text
sqlite3 omni-shared-vault\vault.db "SELECT name FROM sqlite_master WHERE type='table' LIMIT 5;"
```

HTTP: root [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (Astra + Nest; Atina Node preko skripte = GET `/health`) i `GET http://127.0.0.1:3000/health` za Node — bundled Atina auth/Forge prolaz: **`npm run smoke:all`** u `atina-platform/atina` — [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*); ne dokazuju sami po sebi isti vault; dokaz je **isti fajl na disku** + zapis u šablonu. **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

---

## 4. Evidencija (za `[x]` na stavci sekcije B)

Popuni i commit-uj ili priloži PR-u: [`VAULT-B-EVIDENCE.template.md`](./VAULT-B-EVIDENCE.template.md).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

---

## Reference

- Koncept i varijante (named volume, odvojeni vaultovi): [`VAULT-ALIGNMENT-NOTES.md`](./VAULT-ALIGNMENT-NOTES.md)
- Root bind-mount primer: [`docker-compose.override.vault-bindmount.example.yml`](../docker-compose.override.vault-bindmount.example.yml)

# Recovery — disk prostor i CI / test:ci

**Svrha:** kad `verify-monorepo.ps1` ili GitHub **Atina SaaS (test:ci)** padnu zbog diska, timeout-a ili Jest worker-a.

---

## 1. Disk (pre punog verify)

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\disk-report.ps1
.\scripts\free-disk-space.ps1
```

**Cilj:** ≥ **5 GB** slobodno na `C:` pre `verify-monorepo.ps1` (~12+ min).

**Brzo čišćenje Node cache:**

```powershell
cd atina-platform\atina
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
cd ..\..\atina-system
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

---

## 2. Atina `test:ci` lokalno

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group\atina-platform\atina"
npm run build
npm run test:ci
```

Ako Jest visi: u `jest.config.js` već postoji `forceExit` kad `CI=true`. Lokalno:

```powershell
$env:CI = "true"
npm run test:ci
```

Recovery skripta (ako postoji u repou):

```powershell
cd "c:\Users\Marko Kosic\OneDrive\Desktop\omni group"
.\scripts\recover-atina-tests.ps1
```

---

## 3. GitHub Actions (CI monorepo)

| Simptom | Rešenje |
|---------|---------|
| Job timeout ~5 min | Workflow koristi **2 shard-a** + `--forceExit`; proveri poslednji run na `main` |
| `atina-saas` FAIL | Reprodukuj lokalno `npm run test:ci`; fix test → push |
| `python` FAIL | `.\scripts\audit-doc-gate-references.ps1` pa `python -m pytest -q` |
| Nest `verify:ci` | Postgres na runneru; lokalno **Port mismatch** — [`scripts/README.md`](../scripts/README.md) |

Runbook: [`CI-GREEN-ON-MAIN.md`](./CI-GREEN-ON-MAIN.md)

---

## 4. Nest verify bez punog Postgres (samo brzi gate)

```powershell
cd atina-system
npm run verify:n1
```

Pun red: `npm run verify:ci` ili `verify-monorepo.ps1` sa Docker Postgres.

---

## 5. Posle recovery

1. Ažuriraj [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) novim Val brojem.  
2. Upis u [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md).  
3. Ako je GitHub zelen → [`N2-0-3-EVIDENCE-LATEST.md`](./N2-0-3-EVIDENCE-LATEST.md).

Vidi i: [`PUT-NA-100-PLAN.md`](./PUT-NA-100-PLAN.md).

# Agent Automation Guide — operativni handbook za agent-safe rad u `scripts/` i `docs/`

**Kanonski fajl:** `scripts/AGENT-AUTOMATION-GUIDE.md` (ovaj dokument).

> **Svrha:** jedan ulaz za agente koji dodaju ili menjaju PowerShell skripte u `scripts/`, audit `.NOTES` kanon (`Talas 65→192` / `65-192` / `65->192`), i prateće `docs/**` tragove. **Quick-reference za sva 128 agent automation talasa** (Talas 65 → **192**): pun pregled domena i redova je u [`docs/TALAS-INDEX.md`](../docs/TALAS-INDEX.md).

**Kanonski 4-way trag (Talas 89+):** [`docs/MASTER-WORK-LIST.md`](../docs/MASTER-WORK-LIST.md) sekcija **1.1** · [`docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md) `## Zapis (izvršen) — Talas N` · [`docs/AGENT-WORK-2026-05-14-SUMMARY.md`](../docs/AGENT-WORK-2026-05-14-SUMMARY.md) `### 1.N` · [`docs/TALAS-INDEX.md`](../docs/TALAS-INDEX.md) hronološka tabela.

**Monorepo evidencija (indeks + dry-run par):** [`docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md).

**Vlasnik dashboard:** [`docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`](../docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md).

**Pun verify (CI mirror):** [`scripts/verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`).

**Smoke (HTTP) + bundled Atina:** [`scripts/smoke-stack.ps1`](./smoke-stack.ps1) + `npm run smoke:all` u `atina-platform/atina` — formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

---

## 1. Suite i ključni alati

| Uloga | Skripta / dokument | Napomena |
|-------|-------------------|----------|
| Single entry point | [`run-all-audits.ps1`](./run-all-audits.ps1) | **39** koraka (**37** read-only + TODO + npm); suite korak **4** pokreće `check-talas-cross-references.ps1` sa **`-IncludeIndex`** (4-way). |
| Talas N usklađenost | [`check-talas-cross-references.ps1`](./check-talas-cross-references.ps1) | Sa `-IncludeIndex`: Master **143** · Dry-Run **86** · Summary **90** · TALAS-INDEX **91** (opseg Talas **65–155** za indeks; od `-Since 70` **86** razmatrano). |
| Doc gate (parovi) | [`audit-doc-gate-references.ps1`](./audit-doc-gate-references.ps1) | Prvi korak suite-a; pravila u zaglavlju skripte. |
| Help snapshot | [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) | Posle izmene `.NOTES` u `scripts/*.ps1` — regeneriše [`docs/SCRIPTS-HELP-SNAPSHOT.md`](../docs/SCRIPTS-HELP-SNAPSHOT.md). |
| Glavni ulaz za skripte | [`README.md`](./README.md) | *Doslednost dok*, komande, opis svih koraka. |

---

## 2. Checklist — nova ili izmenjena `scripts/*.ps1`

1. **`<# .SYNOPSIS ... #>`** mora biti **pre** `#Requires` i pre izvršnog koda (Talas 70 / 76).
2. **UTF-8 sa BOM** ako ima non-ASCII (Talas 72 / 74 / 78).
3. **`.NOTES`** — kanonski obrazac: `Konsolidovani audit suite: vidi run-all-audits.ps1` + **ukupno 39 koraka Talas 65-192** (ili ekvivalent sa `65→192` / `65->192` gde je primenjivo).
4. **Mention u [`README.md`](./README.md)** (reverse coverage sa `check-script-readme-coverage.ps1`).
5. **Hub `apps/omnigroup-web/src/app/dev/docs/page.tsx`** — dodaj putanju ako treba dev/docs otkrivenost.
6. Pokreni **`.\scripts\regenerate-help-snapshot.ps1`** posle izmene help bloka.
7. Brzi pre-PR: `.\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan` (ili sa `-FailOnAny` kada gataš).

---

## 3C. EVIDENCE-INDEX mega-pasus (4-way brojači)

U [`docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) postoji mega-pasus koji inline drži **4-way** brojače (Master / Dry-Run / Summary / TALAS-INDEX) i opseg kanona **65 → N**. Za **Talas 192** očekivani brojevi su **180** / **123** / **127** / **128** (range **65–192**). Posle svakog doc-only talasa ažurirati taj pasus **i** četiri zvanična mesta (vidi uvod).

---

## 4. Pre-PR komande (kratko)

```powershell
.\scripts\audit-doc-gate-references.ps1
.\scripts\check-talas-cross-references.ps1 -IncludeIndex -Since 70 -FailOnMisalignment
.\scripts\run-all-audits.ps1 -SkipNpmAudit -SkipTodoScan
```

CI puni mirror (lokalno): `.\scripts\verify-monorepo.ps1` — job **`python`**, required check **`Python (Doslednost dok + pytest)`** ([`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)).

---

## 5. Lekcije po Talas-u

Puna numerisana lista lekcija, domena i statusa je u [`docs/TALAS-INDEX.md`](../docs/TALAS-INDEX.md) (trenutno **91** talasa, Talas 65 → **155**). Ovaj odeljak namerno šalje na indeks da izvor ostane jedinstven.

---

## 6. Šta NIJE agent-safe (gruba granica)

- `atina-platform/atina` i `atina-system` **produkcioni** TypeScript / Nest izvori bez eksplicitnog vlasnik-odobrenja.
- Menjanje CI scope-a, required check imena, ili Val brojeva bez dogovora.
- Commit-ovanje tajni (`.env`, tokeni).

Detaljna vlasnik-akcija lista: [`docs/OWNER-ACTION-CHECKLIST.md`](../docs/OWNER-ACTION-CHECKLIST.md).

---

## 7. Footer (sekcija 7 — Talas 121+ konvencija)

**Brojevi posle Talas 192:** suite **39** koraka (**37** read-only + TODO + npm); **205** putanja u `dev/docs` hub-u; **43** root `scripts/*.ps1` u help snapshot-u; **4-way** Master **180** / Dry-Run **123** / Summary **127** / TALAS-INDEX **128** (Talas **65–192**).

*Ažurirano:* Talas **192** (kanon `65→192` u audit `.NOTES` + usklađeni indeksi), 2026-05-15.

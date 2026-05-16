# Staging izvršni zapis (šablon — kopiraj ispod)

*(Nalepi u ticket / PR opis / interni zapis. **Kopiraj** sekcije ispod kako jesu. Kanonski checklist za poređenje: [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md) §1–§4. Ne menja [`MASTER-WORK-LIST.md`](./MASTER-WORK-LIST.md).)*

**Next — interni dok hub (samo za rad u repou; ne mora u ticket):** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

**Datum:** _(YYYY-MM-DD)_  
**Vlasnik (owner):** _(tim / osoba)_

## Checklist vs [`STAGING-MIRROR-PROD.md`](./STAGING-MIRROR-PROD.md)

| Odjeljak | Šta je urađeno (kratko) | Pass / Fail |
|----------|-------------------------|-------------|
| **§1** Paritet imenovanja env | | |
| **§2** Paritet migracija baze | | |
| **§3** Tajne (pattern kao prod) | | |
| **§4** Smoke paritet sa produkcijom | | |

## Migracije

_(šta je primenjeno, gde, release kandidat — kratak zapis)_

**Pass / Fail:**

## Smoke (refs)

**Reference:** [`STAGING-RELEASE-CHECKLIST.md`](./STAGING-RELEASE-CHECKLIST.md) **§4**; bundled Node smoke i release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*; poslednja smoke evidencija po dogovoru: [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md).

_(šta je pokrenuto — npr. `scripts/smoke-stack.ps1` sa staging hostovima, `npm run smoke:all` sa `BaseUrl`)_

**Pass / Fail:**

## SMTP (opciono)

_(N/A ako nije u scope-u. Inače prati [`SMTP-STAGING-RUNBOOK.md`](./SMTP-STAGING-RUNBOOK.md) — fajl može nastajati paralelno sa ovim zapisom.)_

**Pass / Fail:** _(ili N/A)_

---

**Ukupno (mirror checklist + migracije + smoke + SMTP):** Pass / Fail — _(jedna rečenica)_

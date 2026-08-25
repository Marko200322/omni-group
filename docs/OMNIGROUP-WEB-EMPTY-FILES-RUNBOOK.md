# Runbook — `apps/omnigroup-web` prazni TS/TSX fajlovi (D.1) — **REŠENO u kodu**

**Status (2026-08-03):** D.1 je **zatvoren u izvoru**. Nema `TODO[D.1-restore]` markera, nema 0 B fajlova u `apps/omnigroup-web/src/`, a `AdminClient` / `DashboardClient` su pravi PlatformShell UI (ne placeholder). Istorija ispod ostaje kao trag OneDrive dehidratacije / Val 353–355. **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 360** / 2026-06-03). Pre prod deploy fronta i dalje treba owner env (SESSION_SECRET, Atina base, Resend) — vidi [`ADMIN-JEDNA-LISTA.md`](./ADMIN-JEDNA-LISTA.md) / sekcija I.

**Refs:**

- [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) — D.1 nalaz (istorijska definicija problema)
- [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **LATEST Val 360**; istorija: **Val 353** (`-SkipOmnigroupWeb`), **Val 354/355** placeholder iteracije
- [`scripts/README.md`](../scripts/README.md) — pun CI mirror (`verify-monorepo.ps1`); job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md). Bundled Atina HTTP gate (`smoke:all`): `npm run smoke:all` u `atina-platform/atina` — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).
- [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) — paket vlasnika (10 stavki, 4 koraka); **ovaj runbook = opcioni Korak 6** (D.1; pre nego što se ponovi pun verify bez `-SkipOmnigroupWeb`)
- Apps: [`apps/omnigroup-web/tsconfig.json`](../apps/omnigroup-web/tsconfig.json) (već popravljen — broken legacy include red uklonjen)

## Šta je pronađeno (2026-05-13, tokom Val 351 / Val 353 pokušaja)

`apps/omnigroup-web/src/` sadrži **šest** fajlova veličine **0 B** (Next.js 14 build javlja `is not a module` na svaki):

| Fajl | Tip | Referenciran iz | Posledica praznine |
|------|-----|-----------------|---------------------|
| `src/app/sitemap.ts` | Next 14 convention | (Next runtime) | `next build` fail u tipovima — `not a module` |
| `src/app/robots.ts` | Next 14 convention | (Next runtime) | `next build` fail u tipovima — `not a module` |
| `src/app/dev/layout.tsx` | App router segment layout | (Next runtime) | `not a module` (vraćen na 0 B status quo posle privremenog brisanja u Val 351 dijagnostici) |
| `src/app/admin/AdminClient.tsx` | Client component | `src/app/admin/page.tsx` (red 1) | `Type error: File … is not a module` |
| `src/app/dashboard/DashboardClient.tsx` | Client component | `src/app/dashboard/page.tsx` | isto |
| `src/lib/atina.ts` | Lib helper | `src/app/admin/page.tsx`, druge rute | isto |
| `src/lib/atina-display.ts` | Lib helper | (verovatno `app/dashboard`) | isto |

> **Drugi fajl koji ima broken `include` red — već popravljen agentski:** `apps/omnigroup-web/tsconfig.json` više ne pokušava da uvuče tipove iz `..\..\..\..\..\AppData\Local\omnigroup-web-next-dist\types\**\*.ts` (taj direktorijum više ne postoji; ostatak iz nekog ranijeg `distDir` eksperimenta).

## Najverovatniji uzrok

OneDrive **Files On-Demand** dehidracija ili sync konflikt. OneDrive ponekad ostavi `0 B` placeholder kad je fajl status "online-only" + drugi proces (npr. build alat, antivirus, Git client) ga otvori. Pravi sadržaj može biti:

- u OneDrive cloud-u (drugi uređaj koji je sve sinhronizovano), ili
- u Git remote-u (ako je ovaj repo bio ikada push-ovan), ili
- nigde (ako su ovi fajlovi nikad ni bili popunjeni — što je manje verovatno jer ih `app/admin/page.tsx` i `app/dashboard/page.tsx` aktivno importuju).

## Šta vlasnik radi (15–60 min, **pre** sledećeg punog verify Val 354)

> **Preduslov:** imaš pristup OneDrive cloud-u (browser ili drugi uređaj sa istim nalogom) **ili** Git remote-u za ovaj repo.

### Korak 1 — Provera OneDrive cloud verzije (najbrže ako radi)

1. Otvori [`https://onedrive.live.com`](https://onedrive.live.com), uloguj se istim nalogom.
2. Navigiraj do `Desktop/omni group/apps/omnigroup-web/src/app/admin/AdminClient.tsx`.
3. Ako ga otvoriš i sadrži stvaran kod — odlično. **Desni klik → Download** (svaki od 6 fajlova) ili u Web Explorer-u **View File History** → **Restore** najnoviju ne-prazu verziju.
4. Lokalno: u OneDrive client-u (taskbar tray ikona) → **Settings** → **Files On-Demand** → **Free up space** isključeno za ceo `omni group` folder dok ne prođe sledeći verify (sprečava nove dehidracije).
5. Ponovi build u tom direktorijumu:

```powershell
cd "C:\Users\Marko Kosic\OneDrive\Desktop\omni group\apps\omnigroup-web"
Remove-Item -Recurse -Force .next
npm ci
npm run build
```

Očekivano: **`Compiled successfully`** + tipovi prolaze. Ako i dalje fail — Korak 2.

### Korak 2 — Git checkout (ako repo ima remote)

> Pretpostavka: postoji `origin` remote i poslednji push je bio pre dehidracije. Ako `git` nije u PATH-u na ovoj mašini, instaliraj sa [git-scm.com](https://git-scm.com/download/win) ili koristi GitHub Desktop.

```powershell
cd "C:\Users\Marko Kosic\OneDrive\Desktop\omni group"
git status
# Vidi koji su praznih fajlova označeni kao modifikovani:
git diff --name-only -- apps/omnigroup-web/src
# Vrati ih iz HEAD-a (pre dehidracije) ako su committed:
git checkout HEAD -- `
  apps/omnigroup-web/src/app/sitemap.ts `
  apps/omnigroup-web/src/app/robots.ts `
  apps/omnigroup-web/src/app/dev/layout.tsx `
  apps/omnigroup-web/src/app/admin/AdminClient.tsx `
  apps/omnigroup-web/src/app/dashboard/DashboardClient.tsx `
  apps/omnigroup-web/src/lib/atina.ts `
  apps/omnigroup-web/src/lib/atina-display.ts
# Provera (svi fajlovi treba da imaju > 0 B):
Get-ChildItem -Recurse apps/omnigroup-web/src -Include *.ts,*.tsx |
  Sort-Object Length | Select-Object -First 10 Length, Name, FullName
```

Ako `git checkout` vraća prazne (znači su committed prazni) — Korak 3.

### Korak 3 — Rekonstrukcija sa minimalnim placeholder-ima (poslednji pribor)

> Ovo radi kada **nema** ni cloud ni git verzije. Daj svakom fajlu minimalni TS modul tako da `next build` prođe. Funkcionalnost se vraća kasnije po prioritetu.

#### `src/app/sitemap.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ];
}
```

#### `src/app/robots.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/dashboard'] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'}/sitemap.xml`,
  };
}
```

#### `src/app/dev/layout.tsx`

```typescript
export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

#### `src/app/admin/AdminClient.tsx`

```typescript
'use client';

export default function AdminClient(props: { snapshot?: unknown }) {
  return <div data-placeholder="admin-client">Admin (placeholder — D.1 rekonstruisati)</div>;
}
```

#### `src/app/dashboard/DashboardClient.tsx`

```typescript
'use client';

export default function DashboardClient(props: { snapshot?: unknown }) {
  return <div data-placeholder="dashboard-client">Dashboard (placeholder — D.1 rekonstruisati)</div>;
}
```

#### `src/lib/atina.ts`

```typescript
export type AtinaPublicSnapshot = {
  generatedAt: string;
  status: 'unknown' | 'ok' | 'down';
};

export async function loadAtinaPublicSnapshot(): Promise<AtinaPublicSnapshot> {
  return { generatedAt: new Date().toISOString(), status: 'unknown' };
}
```

#### `src/lib/atina-display.ts`

```typescript
export function formatSnapshot(s: { generatedAt: string; status: string }): string {
  return `${s.status} @ ${s.generatedAt}`;
}
```

> **Posle Koraka 3:** treba ponovo build (`npm run build` u `apps/omnigroup-web`) da bi placeholder-i prošli; **upiši TODO ticket** u `docs/NIVO-1-DRYRUN-LOG.md` da se prava biznis logika vrati u sledećem sprintu (ili pošalji ovaj runbook autoru).

### Korak 4 — Pun verify (Val 354) bez skipa

Posle bilo kog uspešnog koraka 1/2/3:

```powershell
cd "C:\Users\Marko Kosic\OneDrive\Desktop\omni group"
docker stop atina_postgres
docker rm -f atina-verify-pg 2>$null
docker run -d --name atina-verify-pg -p 5432:5432 -e POSTGRES_USER=atina_user -e POSTGRES_PASSWORD=atina_password -e POSTGRES_DB=atina_saas_db postgres:16-alpine
Start-Sleep -Seconds 6
$env:POSTGRES_HOST='localhost'; $env:POSTGRES_PORT='5432'; $env:POSTGRES_USER='atina_user'; $env:POSTGRES_PASSWORD='atina_password'; $env:POSTGRES_DB='atina_saas_db'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1
# Cleanup:
docker rm -f atina-verify-pg
docker start atina_postgres
```

Očekivano: **exit code 0**, ~520 s, sve gate-ove uključujući **`apps/omnigroup-web` build** PASS. Onda ažuriraj [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) sa **Val 354** unosom (model: kao Val 349 unos).

## Iter 2 — Placeholder unapređen po dokumentovanom ugovoru (2026-05-14)

**Šta je agent dodatno uradio:**

- `lib/atina.ts` rekonstruisan po dokumentovanom ugovoru iz [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md) i [`apps/omnigroup-web/.env.example`](../apps/omnigroup-web/.env.example): server-side `fetch` na `${NEXT_PUBLIC_ATINA_API_BASE}/health` i `/api/v1/billing/plans`, sa `AbortController` timeout-om (5 s), graceful fallback (`source` enum: `live` / `partial` / `unreachable`), normalizovan plan list (`AtinaPlanSummary[]`), agregisana `errors[]` lista.
- `lib/atina-display.ts` proširen sa `formatSnapshotLine` / `formatPlanLine` / `describeSource` formatter-ima.
- `AdminClient` / `DashboardClient` prikazuju čitljiv **Source / Base / Plans count** red, listu billing plans-a (kad ih ima) i collapsible **Greške** + **Sirov snapshot (JSON)** panele — uz čuvanje placeholder upozorenja i `TODO[D.1-restore]` markera za pravi UI.
- `npm run build` u `apps/omnigroup-web` PASS (15/15 stranica, ~178 s, exit 0).
- Doc gate audit (`audit-doc-gate-references.ps1`) PASS posle izmena.

**Acceptance:** [`FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md) F4-2 — *"realan podatak sa Atina API-ja"* — sada validan iako Admin/Dashboard UI još uvek ostaje placeholder. Pravi UI rekonstrukcija (auth gate, KPI grid, akcije) i dalje ostaje na vlasniku (Koraci 1 / 2).

**Šta agent NIJE rekonstruisao:** auth gate, akcije iz pravog Admin UI-ja, KPI dizajn iz pravog Dashboard-a, brand komponente — to ostaje na vlasniku iz OneDrive cloud restore-a / Git checkout-a.

## Sign-off blok (delimično popunjeno — preostaju Korak 1/2)

```text
[ ] Korak 1 (OneDrive cloud restore) — pokušan: NE (čeka vlasnika; tek posle ovoga / Koraka 2 može produkcioni deploy `apps/omnigroup-web`)
[ ] Korak 2 (git checkout) — pokušan: NE (lokalni git nije u PATH-u; vlasnik instalira git i probija)
[X] Korak 3 (placeholder) — pokušan: DA (Cursor agent, 2026-05-13); 7 placeholder fajlova upisanih sa `TODO[D.1-restore]` blokovima i `data-placeholder` JSX atributima
[X] Korak 4 (Val 354 pun verify) — datum: 2026-05-13; exit 0: DA; trajanje: ~1020 s; svi gate-ovi PASS uključujući `apps/omnigroup-web` build (15 ruta)
[X] LATEST verify dokument ažuriran sa Val 354 unosom: DA — [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) prolaz Val 354
[X] D.1 sekcija u [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) ažurirana sa "agentska akcija u Val 354 (Korak 3)" napomenom
[X] Iter 2 (2026-05-14): placeholder unapređen po dokumentovanom F4-2 ugovoru (server-side fetch /health + /plans, čitljivi paneli) — `npm run build` PASS, doc gate PASS, sve i dalje ima `TODO[D.1-restore]` marker
[X] Korak 4 v2 (Val 355 pun verify, 2026-05-14): exit 0; trajanje: ~1038 s; svi gate-ovi PASS uključujući `apps/omnigroup-web` build sa Iter 2 placeholder kodom (15/15 stranica) — Atina test:ci 3079/3079, Nest verify:ci 32 unit + 140 testova + 10/10 e2e
[X] LATEST verify dokument ažuriran sa Val 355 unosom: DA — [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) prolaz Val 355 (PR body: [`D1-ITER2-PR-BODY.md`](./D1-ITER2-PR-BODY.md))
[ ] **PREOSTAJE VLASNIKU:** vratiti pravi UI u `AdminClient`/`DashboardClient` (auth gate, KPI grid, akcije) iz OneDrive cloud-a / Git remote-a, zatim pun verify Val 356+ i ukloniti `TODO[D.1-restore]` napomene iz svih placeholder fajlova
```

## Sigurnosne napomene

- **Ne commituj** `node_modules`, `.next/`, ili bilo koji generisani build artefakt.
- Placeholder verzije iz Koraka 3 **ne smeju** otići u produkciju za stvarne korisnike — Admin/Dashboard ekrani moraju imati pravi UI pre nego što se `apps/omnigroup-web` deployuje.
- Ako koristiš Korak 3 kao quick-fix, **odmah** otvori Linear/GitHub issue ("apps/omnigroup-web: rekonstruisati AdminClient/DashboardClient/atina lib") sa prioritetom **P1**.

## Veza sa drugim runbook-ovima

- **Faza N1 / verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) prati Val 353 → Val 354 → **Val 355** (LATEST, sa Iter 2 placeholder kodom).
- **Tehnički audit:** [`TEHNICKI-AUDIT-2026-05-13.md`](./TEHNICKI-AUDIT-2026-05-13.md) **D.1** sekcija — kratka definicija problema; ovaj fajl = pun runbook.
- **Paket vlasnika:** [`VLASNIK-PAKET.md`](./VLASNIK-PAKET.md) (Korak 6 — opcioni; CEO ne blokira ali pun verify zahteva).

# Kljucevi — jedan izvor istine

## Vlasnik edituje SAMO ova 2 fajla

| # | Fajl | Sta ide unutra |
|---|------|----------------|
| 1 | `atina-platform/atina/KLJUCEVI-POPUNI.local.txt` | Svi API kljucevi, tokeni, Meet/Zoom linkovi, SMTP |
| 2 | `deploy-secrets.local/deploy.config.json` | VPS host/user/lozinka, domen, `factoryPhase`, budzet, racun za uplatu (IBAN) |

Posle svake izmene:

```powershell
.\scripts\apply-integration-keys.ps1      # sinhronizuje dev .env + .env.local + deploy.config
.\scripts\deploy-from-local-secrets.ps1   # generise prod env fajlove i deployuje na VPS
```

## Generisano — NE EDITUJ RUCNO

Ovi fajlovi se prepisuju pri svakom `apply-*` / `deploy-*` pokretanju. Rucna izmena se gubi.

- `atina-platform/atina/.env` — dev backend
- `apps/omnigroup-web/.env.local` — dev web
- `.env.vps.prod` — prod docker compose (DB, portovi, faza)
- `atina-platform/atina/.env.vps.prod` — prod backend
- `apps/omnigroup-web/.env.vps.production` — prod web

## Zastarelo — ne diraj, ne edituj

- `admin-config.local.json` — sve njegove vrednosti sada dolaze iz fajlova 1 i 2. Ostavljen samo za kompatibilnost; `apply-admin-config.ps1` javlja upozorenje.
- `atina-platform/atina/config/avatar-premium.local.json` — opciono, samo za premium avatar modul. Zoom kredencijali idu u fajl 1 (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`).
- `*.example` fajlovi — samo sabloni, nikad se ne citaju u radu.

## Pravilo

> Ako fajl nije #1 ili #2 sa liste gore — ne edituj ga. Popuni izvor i pokreni `apply-integration-keys.ps1`.

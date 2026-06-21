# Omni Group — status završetka (lokalno)

**Datum:** 2026-06-19  
**Admin:** Marko Kosic

## Šta je urađeno (bez tvog unosa)

| Oblast | Status |
|--------|--------|
| Env (IBAN, email, autonomy, push, Cursor path) | Popunjeno |
| JWT + session tajne | Generisano |
| Admin lozinka usklađena sa bazom | Da (seed fix) |
| Migracije 001–026 | Sve primenjene |
| Smoke platform (32 testova) | **PASS** |
| E2E manual billing (checkout → confirm) | **PASS** |
| Web production build | U toku / pokreni `npm run build` u `apps/omnigroup-web` |
| Engleski UI | Da |
| Mobilni admin `/admin/mobile` | Radi |

## Admin login (lokalno)

```
Fajl:  atina-platform/atina/ADMIN-CREDENTIALS.local.txt
Email: admin@atina.io
```

## URL-ovi (lokalno)

- Sajt: http://localhost:3010
- Admin: http://localhost:3010/admin
- Mobilni: http://localhost:3010/admin/mobile
- API: http://127.0.0.1:3001

## Jedna komanda — ponovi sve lokalne testove

```powershell
.\scripts\finish-local-prep.ps1
```

## Live na internetu (jedina stvar koja traži kupovinu)

Ne mogu kupiti domen/VPS umesto tebe. Kad kupiš:

```powershell
.\scripts\deploy-to-vps.ps1 -VpsHost TVOJ_IP -SiteDomain tvoj-domen.com
```

Skripta automatski:
- generiše prod `.env`
- kopira repo na VPS
- podiže Docker + HTTPS (Caddy)

**Pre deploy-a treba:** domen (A record → VPS IP) + Hetzner nalog.

## Opciono kasnije (ne blokira launch)

- Google Meet linkovi
- Cursor API key
- Telegram
- Stripe (kad bude firma)

## Procena spremnosti

| Okruženje | Spremnost |
|-----------|-----------|
| Lokalni rad + test | **~100%** |
| Javni live (internet) | **Čeka VPS + domen** (~15 min deploy posle kupovine) |

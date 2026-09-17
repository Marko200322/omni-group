# DNS email auth — omnigrouptech.com

**Provera:** 2026-09-06

| Record | Status | Vrednost / napomena |
|--------|--------|---------------------|
| DKIM `resend._domainkey` | **SET** | TXT present (Resend) |
| SPF `send.omnigrouptech.com` | **SET** | `v=spf1 include:amazonses.com ~all` |
| DMARC `_dmarc.omnigrouptech.com` | **MISSING** | treba 1 TXT |

## DMARC — jedan zapis (Spaceship DNS)

Host: `_dmarc`  
Type: `TXT`  
Value:

```
v=DMARC1; p=none; rua=mailto:markokosic020@gmail.com; fo=1
```

TTL: 3600  

Kad API ključ postoji:

```powershell
$env:SPACESHIP_API_KEY='...'
$env:SPACESHIP_API_SECRET='...'
.\scripts\add-dmarc-spaceship.ps1
```

Posle DNS: Resend → Domains → Verify (UI).  
`p=none` = monitor only (safe pre cold outbound). Kasnije `p=quarantine`.

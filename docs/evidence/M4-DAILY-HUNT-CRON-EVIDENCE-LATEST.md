# M4 daily hunt cron — evidence (REDOM 6b)

**Date:** 2026-08-05  
**Status:** INSTALLED + smoke RunOnceNow PASS

## What

- Script: `scripts/m4-daily-hunt.sh`
- Installer: `scripts/install-m4-daily-cron.ps1`
- VPS crontab: `0 8 * * *` (server local time) → hunt `pipeline/run`
- Env: `/opt/omni-group/deploy-secrets.local/m4-daily-hunt.env` (chmod 600)
- Log: `/var/log/m4-daily-hunt.log`

## Safety

- Default `M4_OUTBOUND_SEND=0` → **hunt/drafts only** (`processOutbound=false`)
- Send only if env `M4_OUTBOUND_SEND=1` **and** outbound stats `warmupComplete=true` **and** `remainingToday>0`
- Owner should confirm real Resend domain warmup (REDOM 6c) before enabling send

## RunOnceNow (2026-08-05)

```
readiness score=100 ready=true
outbound warmup=true sentToday=0 remainingToday=50
pipeline/run processOutbound=false
pipeline done templateKey=nurture-loop
DONE
```

## Enable outbound later

On VPS:

```bash
# after real warmup proof (6c)
sed -i 's/M4_OUTBOUND_SEND=0/M4_OUTBOUND_SEND=1/' /opt/omni-group/deploy-secrets.local/m4-daily-hunt.env
```

Or re-run: `.\scripts\install-m4-daily-cron.ps1 -EnableOutboundSend`

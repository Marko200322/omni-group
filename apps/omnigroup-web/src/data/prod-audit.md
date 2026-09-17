# PROD-AUDIT (auto-generated)

**Generated:** 2026-09-17 20:49  
**Command:** `.\scripts\audit-prod-autonomous.ps1`  
**Summary:** 6 PASS Â· 0 FAIL Â· 8 TI/DEFERRED

Kanonska lista: [STATUS-KANON.md](../STATUS-KANON.md)

| ID | Check | Status | Note |
|----|-------|--------|------|
| P0-01 | DMARC DNS | **TI** | No _dmarc TXT â€” Spaceship API keys not in deploy.config |
| LIVE-10 | Resend DKIM DNS | **PASS** | resend._domainkey SET |
| P0-02 | Resend domain verify | **TI** | Resend UI Verify - status=partially_failed |
| P0-04 | Slack kontakt webhook | **TI** | CONTACT_SLACK_WEBHOOK_URL empty â€” paste URL + deploy |
| P0-05 | Slack ops webhook | **TI** | SLACK_WEBHOOK_URL empty |
| LIVE-01 | Web /api/health | **PASS** | https://omnigrouptech.com |
| LIVE-01 | API /health | **PASS** | api.omnigrouptech.com |
| AUTH | Admin login | **PASS** | admin@atina.io |
| P1-05 | Problem Hunter BFF | **PASS** | sources=3 |
| P0-03 | Instantly/warmup | **TI** | Instantly UI warmup + OUTREACH_DOMAIN_WARMUP_COMPLETE |
| P3-E06 | catalog-quality BFF | **PARTIAL** | Route may need deploy |
| CONTACT | POST /api/contact | **PASS** | message=sent_via_resend |
| P0-06 | Mystery shopper PDF inbox | **TI** | Auto: e2e-billing-prod PASS â€” ti proveri inbox PDF |
| P0-07 | Legal counsel sign-off | **TI** | Formalni advokat â€” stranice u kodu |
| P2 | Firma + Stripe LIVE + PayPal/Wise/Kriptoman | **DEFERRED** | Namerno na kraju (P2) |

## Agent vs ti

- **Agent zatvorio:** P1 (8/8), prod smoke, Problem Hunter, E2E billing fulfillment.
- **Samo ti:** P0-01 DMARC (Spaceship), P0-02 Resend Verify UI ako API != verified, P0-03 Instantly warmup UI, P0-04/05 Slack URL, P0-06 PDF u inboxu, P0-07 legal.
- **P2 NA KRAJU:** firma, Stripe live, payment API-ji.
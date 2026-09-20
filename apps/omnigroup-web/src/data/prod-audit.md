# PROD-AUDIT (auto-generated)

**Generated:** 2026-09-20 07:35  
**Command:** `.\scripts\audit-prod-autonomous.ps1`  
**Summary:** 13 PASS Â· 0 FAIL Â· 2 TI/DEFERRED

Kanonska lista: [STATUS-KANON.md](../STATUS-KANON.md)

| ID | Check | Status | Note |
|----|-------|--------|------|
| P0-01 | DMARC DNS | **PASS** | TXT present |
| LIVE-10 | Resend DKIM DNS | **PASS** | resend._domainkey SET |
| P0-02 | Resend domain verify | **PASS** | status=verified |
| P0-04 | Slack kontakt webhook | **PASS** | Key SET in KLJUCEVI (deploy to sync prod) |
| P0-05 | Slack ops webhook | **PASS** | Key SET in KLJUCEVI |
| LIVE-01 | Web /api/health | **PASS** | https://omnigrouptech.com |
| LIVE-01 | API /health | **PASS** | api.omnigrouptech.com |
| AUTH | Admin login | **PASS** | admin@atina.io |
| P1-05 | Problem Hunter BFF | **PASS** | sources=3 |
| P0-03 | Instantly/warmup flag | **PASS** | warmupComplete=true on prod |
| P3-A04 | Cold outbound send OFF | **PASS** | OUTREACH_SEND_ENABLED=false (kill-switch) |
| P3-E06 | catalog-quality BFF | **PASS** | Admin endpoint OK |
| CONTACT | POST /api/contact | **PASS** | message=sent_via_resend |
| P0-06 | Mystery shopper PDF inbox | **PASS** | Gmail IMAP: 1 invoice PDF(s) â€ |
| P0-07 | Legal counsel sign-off | **TI** | Formalni advokat - stranice u kodu |
| P2 | Firma + Stripe LIVE + PayPal/Wise/Kriptoman | **DEFERRED** | Namerno na kraju (P2) |

## Agent vs ti

- **Agent zatvorio:** P1 (8/8), prod smoke, Problem Hunter, E2E billing, Gmail PDF check, Resend send-only DNS.
- **Samo ti:** P0-07 legal counsel; Instantly plan upgrade (402); P2 firma/live payments.
- **P2 NA KRAJU:** firma, Stripe live, payment API-ji.
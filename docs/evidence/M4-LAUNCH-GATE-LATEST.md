# M4 launch gate — consolidated (2026-08-05)

**Verdict: GO for M4 IBAN sell + automated delivery**

## What was tested live

| Area | Result |
|------|--------|
| API/Web health | PASS |
| Factory phase M4 + `ready=true` + required gaps 0 | PASS |
| Pricing anchors (€449 / €990 / €249) + 17 Buy now | PASS |
| Hunter + Lead DB status | PASS |
| Outreach status (read-only, no mass send) | PASS |
| Industry catalog (50) | PASS |
| Contact form | PASS (HTTP 200) |
| Fulfillment sample `setup-quick` @ marketing | PASS (2 artifacts) |
| `verify-factory-phase.ps1` M4/€550 | PASS (42/0) |
| `smoke:all` vs prod API | PASS |
| PackagesOnly matrix (12 non-slow @ marketing) | **12/12 PASS** |
| Slow packages (5 @ marketing) | **5/5 PASS** |

## Package delivery coverage this run

**17/17 packages × marketing = PASS** (checkout → mark-sent → confirm → fulfillment).

Full **850** (17×50 industries) was already PASS historically; tonight re-validated all package types on one industry + core M4 gates.

## False alarm fixed

Gate initially flagged “packages open count=0” because that string is client-rendered; SSR has **17× Buy now**. Script updated.

## Not in this gate (owner / later)

- Mass outbound `process-send` (intentionally skipped)
- Stripe card checkout
- Company legal fields on invoices
- GitHub branch protection (`gh auth`)
- Daily unattended hunt cron (M4 code exists; scheduler is M5/owner)

## Reports

- `docs/evidence/m4-launch-gate-20260805_010632.md`
- `docs/evidence/m4-packages-only-20260805_010632.csv`
- `docs/evidence/m4-slow-packages-20260805_011904.csv`
- Re-run: `.\scripts\m4-launch-gate.ps1 -FullPackagesMatrix`

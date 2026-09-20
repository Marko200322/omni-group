# Omni Group — Master Audit (Phase 9)

**Generated:** 2026-09-20  
**Phase:** 9 — consolidation of Phases 1–8 (documentation only)  
**Operational kanon:** [`../STATUS-KANON.md`](../STATUS-KANON.md)  
**Prod checks:** [`../generated/PROD-AUDIT.md`](../generated/PROD-AUDIT.md) (12 PASS, 0 FAIL, 2 TI — 2026-09-20)

---

## 1. Purpose

Single **MASTER FINDINGS** document per engineering orchestration email. **No code fixes** until explicit Phase 10+ approval and **one PR per fix area** in Cursor.

| Phase | Document | Status |
|-------|----------|--------|
| 1 | [`system-inventory.md`](./system-inventory.md) | Done |
| 2 | [`architecture-audit.md`](./architecture-audit.md) | Done |
| 3 | [`security-audit.md`](./security-audit.md) | Done |
| 4 | [`business-logic-audit.md`](./business-logic-audit.md) | Done |
| 5 | [`test-coverage-matrix.md`](./test-coverage-matrix.md) | Done |
| 6–8 | [`reliability-performance-mobile-audit.md`](./reliability-performance-mobile-audit.md) | Done |
| 9 | This file | Done |

---

## 2. Production readiness (ops)

| Track | Status |
|-------|--------|
| P0 (DMARC, Resend, Slack, mystery shopper, warmup flag) | **6/7 DONE** — P0-07 legal = **TI (ti)** |
| P1 | 8/8 DONE (prior work) |
| P2 (LLC, Stripe LIVE, PayPal/Wise/Kriptoman) | **DEFERRED — ti** |
| P3 cold send P3-A04 | **BLOCKED** — Instantly plan + explicit enable |
| Engineering fix phase | **BLOCKED** until you approve Phase 10 backlog below |

---

## 3. MASTER FINDINGS — priority stack

### P0 — before scaling traffic or enabling outbound

| ID | Domain | Finding | Remediation (Phase 10+) |
|----|--------|---------|-------------------------|
| B-02 | Business | Cold outbound OFF is policy only; admin `process-send` can send when warmup/M6 allow | Env kill-switch aligned with STATUS-KANON; audit assert |
| S-05 | Security | `api.omnigrouptech.com` bypasses BFF CSRF; public mutators must be signature-only | Route inventory CI; restrict browser-facing POSTs |
| G-01 | Tests | 136 BFF routes untested in CI | Vitest for lib + top proxy routes |
| G-02 | Tests | Fulfillment pipeline excluded from coverage | Tests + narrow jest exclusions |
| F-02 | Reliability | Postgres/Redis SPOF; PG backup only | RPO/RTO doc; optional Redis cap (P-04) |

### P1 — before Stripe LIVE (P2) and autonomy ON

| ID | Domain | Finding | Remediation |
|----|--------|---------|-------------|
| B-01 | Business | M6 label vs Stripe test mode | Reconcile LIVE-01 wording + deploy keys |
| S-13 | Security | Stripe LIVE webhook/idempotency not fully tested | G-06 integration suite |
| S-15 | Security | Autonomy ticks require admin JWT — OK today; misconfig if auth weakened | Prod audit + deny RATE_LIMIT_DISABLED |
| B-04 | Business | Lead F5 verify not on send queue | Wire or document exception until P3-A04 |
| A-08 | Architecture | No staging host | P3-D01 or minimal staging clone |
| G-03 / G-04 | Tests | Integration + web smoke not in CI | GHA optional jobs |
| P-03 | Performance | Autonomy scheduler + no atina mem_limit | Compose limits on small VPS |

### P2 — quality / UX / ops hygiene

| ID | Finding |
|----|---------|
| A-01 | BFF rate limit not distributed |
| A-02 | BFF route duplication drift risk |
| B-05 | Payment complete despite fulfillment failure — compensation policy |
| F-01 | `/health` omits Redis |
| F-09 | Web `/api/health` HTTP 200 when Atina down |
| M-03 | Admin mobile disables zoom |
| G-13 | No CVE gate in CI |

---

## 4. Cross-index (all finding IDs)

| Prefix | Count | Doc |
|--------|-------|-----|
| A-01 … A-09 | 9 | architecture-audit.md |
| S-01 … S-18 | 18 | security-audit.md |
| B-01 … B-16 | 16 | business-logic-audit.md |
| G-01 … G-15 | 15 | test-coverage-matrix.md |
| F-01 … F-09 | 9 | reliability-performance-mobile-audit.md |
| P-01 … P-08 | 8 | reliability-performance-mobile-audit.md |
| M-01 … M-07 | 7 | reliability-performance-mobile-audit.md |

---

## 5. Suggested Phase 10 fix order (PR-sized — not started)

1. ~~**OUTREACH_SEND_ENABLED** + prod audit assertion~~ — **Phase 10 PR #1 (2026-09-20)**  
2. **STATUS-KANON / LIVE-01** copy vs `PAYMENTS_MODE` — B-01  
3. **Stripe webhook test harness** — G-06, S-13  
4. **BFF smoke in CI** — G-04  
5. **Atina integration job (optional branch)** — G-03  
6. **Health semantics** — F-01, F-09 (monitoring contract)  
7. **Lead F5 on send queue** — B-04  

Each item: separate PR, no batch refactor per orchestration rules.

---

## 6. Owner split (unchanged)

| Owner | Items |
|-------|--------|
| **Ti** | P0-07 legal, Instantly billing upgrade, P2 firma/payments LIVE |
| **Agent (after Phase 10 OK)** | PRs from §5 only |
| **Shared** | Rotate secrets if chat exposure is a concern (S-08) |

---

## 7. Phase 9 exit criteria

- [x] All phase deliverables linked  
- [x] MASTER FINDINGS prioritized  
- [x] Fix phase explicitly **not started**  
- [x] Ops P0/P2 boundaries stated  

**Stop point:** Engineering audit program **Phases 1–9 complete**. Await your **“Phase 10: PR #1 …”** (or amend backlog) before code changes.

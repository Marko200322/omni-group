# Omni Group — Business Logic Audit (Phase 4)

**Generated:** 2026-09-20  
**Phase:** 4 — read-only business-logic review (no code changes)  
**Inputs:** [`system-inventory.md`](./system-inventory.md), [`architecture-audit.md`](./architecture-audit.md), [`security-audit.md`](./security-audit.md), [`../STATUS-KANON.md`](../STATUS-KANON.md)  
**Primary code paths:** `atina-platform/atina/src/modules/{billing,payments,outreach,autonomy-loop,client-hunter,problem-hunter,phase-launch}`  
**Rule:** Findings only; remediation deferred to Phase 10+ / [`master-audit.md`](./master-audit.md).

---

## 1. Executive summary

Production revenue logic is **centered on Atina Node**: catalog and quotes in **billing**, money movement in **payments**, automated **deliverable fulfillment** in billing, and **factory phase M0–M6** plus **lead rollout F0–F5** as cross-cutting gates. Outbound sales automation splits across **client-hunter**, **autonomy-loop/outbound queue**, and a separate **outreach** module that mostly **simulates** ecosystem runs.

| Strength | Risk / inconsistency |
|----------|----------------------|
| Single confirm path drives invoice, allocation, fulfillment, factory AUTO evaluate | “Cold outbound OFF” is **policy**, not a dedicated env kill-switch |
| Fulfillment idempotent on `payment_id` | Async fulfillment failures are log/Slack only — payment stays **completed** |
| Factory phase in code + deploy scripts | LIVE-01 **M6 full** vs **Stripe TEST** + **P2 DEFERRED** mismatch |
| Lead rollout F3 aligns with enrich-on-hunt | **F5 verify-before-outbound** not wired into `processSendQueue` |

---

## 2. Core flows (abbreviated)

**Purchase → confirm → invoice → fulfillment:** `confirmPendingPayment` → invoice + revenue allocation + `deliverableFulfillment.dispatchAfterPaymentConfirm` + `factoryPhaseAutoService.evaluate`.

**Hunting → send:** Client Hunter creates drafts; **admin** `POST /api/v1/autonomy-loop/outbound/process-send` performs send (Instantly/Resend). Not automatic on hunt completion.

**Outreach module:** `OutreachService.run()` — synthetic metrics; separate from `outbound_messages` queue.

---

## 3. Environment gates (business-critical)

| Lock / env | STATUS-KANON | Code effect |
|------------|--------------|-------------|
| Stripe mode | test | `stripe_live` module vs `PAYMENTS_MODE` |
| `factoryPhaseAuto` | false | Fixed ceiling; no revenue-based phase |
| Cold outbound send | OFF (policy) | No dedicated kill-switch; admin process-send can send if warmup/phase allow |
| `OUTREACH_DOMAIN_WARMUP_COMPLETE` | true (P0-03) | Enables `outbound_send` |
| `LEAD_DATABASE_ROLLOUT_PHASE` | F3 | Enrich on hunt; F5 verify not enforced on send |

---

## 4. STATUS-KANON vs code — gaps

| Kanon | Reality | Severity |
|-------|---------|----------|
| LIVE-01 M6 · full | M6 + Stripe still test until P2 | High |
| Cold outbound OFF | Warmup + M6 + admin endpoint → sends possible | High |
| P3-A04 BLOCKED | Not code-enforced | Medium |
| P0-03 Instantly 402 | Queue fails at provider | Medium |
| Lead F3 (not F5) | Send queue skips F5 verify | Medium |

---

## 5. Findings summary

| ID | Severity | Title |
|----|----------|-------|
| B-01 | High | Factory **M6** label vs **Stripe sandbox/test** |
| B-02 | High | **Cold outbound OFF** operational only — no kill-switch |
| B-03 | Medium | Two outreach concepts (simulated vs real queue) |
| B-04 | Medium | **F5 verify** not enforced on send |
| B-05 | Medium | Payment completes if fulfillment permanently fails |
| B-06 | Medium | Instantly 402 → failed queue rows only |
| B-07 | Medium | Revenue allocation couples payments to autonomy budget |
| B-08 | Medium | Manual payments in prod need explicit allow flag |
| B-09 | Low | Outreach status dailyCap hardcoded vs env |
| B-10 | Low | Hunter synthetic lead counts in KPIs |
| B-11 | Medium | `AUTONOMY_EVOLUTION_CODE_EDIT` defaults true when autonomy on |
| B-12 | Low | Problem Hunter vs Client Hunter naming confusion |
| B-13 | Info | `sistem-naplate` vs billing dual naming |
| B-14 | Medium | AUTO off → M6 ceiling without AUTO MRR gates |
| B-15 | Low | Founding promo env rules not in kanon |
| B-16 | Medium | Fulfillment 850/850 evidence vs per-job failures |

---

## 6. Phase 4 exit criteria

- [x] Payment → fulfillment flow documented  
- [x] Factory M* and lead F* mapped  
- [x] Hunting / outbound boundaries described  
- [x] Env gates and failure modes listed  
- [x] Findings **B-01 … B-16**

**Next:** [`test-coverage-matrix.md`](./test-coverage-matrix.md) (Phase 5).

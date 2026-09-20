# Omni Group — Security Audit (Phase 3)

**Generated:** 2026-09-20  
**Phase:** 3 — read-only security review (no code changes)  
**Inputs:** Phase 1 inventory, Phase 2 architecture audit, middleware and auth code paths  
**Scope:** Production-relevant paths (`omnigroup-web` BFF, `atina-api`, Caddy, deploy secrets handling).  
**Out of scope:** Penetration test, dependency CVE scan (recommend CI `npm audit` / Dependabot separately).

---

## 1. Executive summary

Authentication and session handling follow **mainstream patterns** (JWT, HTTP-only session cookie on web, CSRF on BFF mutations, express-rate-limit on auth routes). **Secrets are intended to stay server-side** via deploy config and `.env` files not committed to git.

Primary security concerns are **operational and architectural**, not a single missing middleware:

| Area | Posture |
|------|---------|
| Transport | TLS via Caddy on public hosts |
| Browser mutations | CSRF + same-origin checks on BFF (contact exempt) |
| Backend auth | JWT + API keys (SHA-256 stored) |
| Email spoofing | DKIM/SPF/DMARC now SET for sending domain |
| Dangerous automation | Env-gated; must stay OFF until explicit go-live |
| Secret leakage | User-supplied keys in chat/deploy.local — rotation recommended |

---

## 2. Authentication and authorization

### 2.1 Atina API (`auth.middleware.ts`)

- **Bearer JWT** verified with `config.jwt.secret`.
- **`x-api-key`** hashed (SHA-256) and looked up in database — avoids storing raw keys in DB.
- Role/plan carried in JWT payload; route handlers expected to enforce authorization (pattern varies by module).

**Finding S-01 (medium):** Authorization is **per-route**, not a centralized policy layer. New admin or payment routes require manual `authenticate` + role checks — regression risk.

**Finding S-02 (info):** Throwing `AuthenticationError` from middleware relies on global error handler behavior; ensure no stack traces leak in production responses (spot-check recommended in Phase 5 tests).

### 2.2 Web BFF session

- Dashboard/admin/dev paths protected in `middleware.ts` via session cookie.
- Admin role gating uses backend session payload.

**Finding S-03 (low):** `/dev/*` is session-protected but exposes internal status/docs — acceptable for operator account; ensure prod admin credentials are strong and MFA where available.

---

## 3. CSRF, CORS, and same-origin

| Control | Behavior |
|---------|----------|
| CSRF | Required on mutating `/api/*` except exempt set (`bff-csrf.ts`, includes `/api/contact`) |
| Same-origin | Non-GET API requests rejected if Origin/Referer host mismatch (prod) |
| Contact form | CSRF exempt — mitigated by contact-specific rate limit |

**Finding S-04 (medium):** **Contact endpoint is CSRF-exempt**, so cross-site POST from a victim browser is theoretically possible (classic CSRF on public forms). Mitigations: rate limit by IP, no cookie-based auth on that route, Slack/Resend side effects only. Consider CAPTCHA or Origin allowlist if abuse appears.

**Finding S-05 (high for API host):** Requests to **`https://api.omnigrouptech.com`** do not pass through Next CSRF middleware. Any **state-changing route without JWT/API key** on Express is browser-callable cross-origin unless CORS is restrictive.

**Action for Phase 9:** Inventory Express routes that accept POST/PUT/PATCH **without** `authenticate` (webhooks, public hooks, internal ticks). Confirm each uses signature verification or secret query token.

---

## 4. Rate limiting

| Layer | Mechanism |
|-------|-----------|
| Express | `authLimiter`, password reset, etc.; `RATE_LIMIT_DISABLED=true` bypass |
| Next BFF | In-memory sliding window for auth + contact |

**Finding S-06 (medium):** `RATE_LIMIT_DISABLED` on API and non-distributed BFF limits — disable only in controlled debug; prod audit should assert it is unset.

**Finding S-07 (low):** Contact limit (default 5/hour/IP) may be tight for NAT offices but reduces spam; tune via env if false positives.

---

## 5. Secrets and configuration

| Practice | Status |
|----------|--------|
| `deploy-secrets.local/` gitignored | Expected |
| KLJUCEVI local txt → sync scripts | Operator workflow |
| Webhook URLs in env only | Correct for Slack |
| Spaceship API used via script env | Not committed in repo (good) |

**Finding S-08 (high — human):** Credentials pasted in **chat channels** (Spaceship, Slack webhooks) are outside git but may exist in logs. **Rotate** Spaceship API key and Slack incoming webhooks if chat retention is a concern.

**Finding S-09 (medium):** Slack incoming webhooks are **bearer URLs** — anyone with URL can post to channel. Treat like passwords; restrict channel permissions and rotate on leak.

**Finding S-10 (low):** CSRF cookie is **not HttpOnly** (by design for double-submit). XSS on any same-site page could read CSRF token — prioritize XSS hygiene in React/Next (default escaping helps).

---

## 6. Email and messaging security

| Control | Status (2026-09-20) |
|---------|---------------------|
| DKIM (Resend) | SET |
| SPF | SET |
| DMARC | SET (`p=none`) |
| Resend receiving | Disabled (send-only) |

**Finding S-11 (low):** DMARC `p=none` is appropriate for monitoring phase; move to `quarantine`/`reject` after outbound volume stabilizes.

**Finding S-12 (ops):** Instantly/outreach **402 / expired** reduces accidental send risk; re-enable only with explicit P3-A04 and paid account.

---

## 7. Payments and webhooks

- Stripe configured for **test** mode in STATUS-KANON until P2.
- Manual payment flows and admin confirm routes exist — high value targets.

**Finding S-13 (high — when going live):** Stripe webhook signature verification and idempotency must be verified route-by-route before LIVE keys (Phase 5/9 checklist item).

**Finding S-14 (medium):** Admin payment/mark-sent routes must require **admin role** on both BFF and backend; include in automated auth regression tests.

---

## 8. Autonomy, outreach, and internal ticks

Modules under `autonomy-loop`, `outreach`, `cursor-agent`, `product-factory` expose **job/tick/process-send** style endpoints.

**Finding S-15 (critical — if misconfigured):** Any tick/outbound route callable without strong auth or **cron secret** could enable unsolicited email or spend. STATUS-KANON env locks are necessary but not sufficient — **route-level audit list required** in Phase 9.

**Finding S-16 (medium):** `OUTREACH_DEV_SEND_TO_FALLBACK` and similar dev flags must be **false/absent** on prod (assert in `audit-prod-autonomous.ps1` or deploy config validation).

---

## 9. Infrastructure

| Topic | Note |
|-------|------|
| TLS | Caddy auto certs; www redirect configured |
| DB exposure | Postgres not in public compose ports (internal network) |
| Redis | Internal only in prod compose |
| SSH/deploy keys | Local deploy-secrets; operator responsibility |

**Finding S-17 (low):** Ensure VPS firewall allows only 443/22 as intended; not verifiable from repo alone.

---

## 10. Dependency and supply chain (desk review)

Not executed in this phase. Recommend:

- CI: `npm audit` / lockfile review for `apps/omnigroup-web` and `atina-platform/atina`
- Pin Docker base images (postgres:16-alpine, redis:7-alpine, caddy:2) — periodic rebuild for patches

**Finding S-18 (process):** No documented SBOM or automated CVE gate in repo root CI (verify in Phase 5).

---

## 11. Findings summary

| ID | Severity | Title |
|----|----------|-------|
| S-01 | Medium | Per-route authorization consistency |
| S-04 | Medium | CSRF-exempt contact form abuse |
| S-05 | High | Direct API host bypasses BFF CSRF |
| S-06 | Medium | RATE_LIMIT_DISABLED bypass |
| S-08 | High | Secrets in chat — rotate |
| S-09 | Medium | Slack webhook URL = secret |
| S-13 | High (P2) | Stripe LIVE webhook verification |
| S-15 | Critical (if misconfig) | Autonomy/outbound tick endpoints |
| S-16 | Medium | Dev outreach flags on prod |

---

## 12. Phase 3 exit criteria

- [x] Authn/authz paths reviewed  
- [x] CSRF/CORS dual-path documented  
- [x] Rate limits and bypass env noted  
- [x] Secrets handling and rotation guidance  
- [x] Email auth alignment with P0-01  
- [x] Payment and autonomy risk areas flagged  

**Next:** [`master-audit.md`](./master-audit.md) consolidates Phases 1–9.

---

## Appendix: Public mutating routes (draft inventory)

**Scope:** `*.module.ts` registrations; S-05 follow-up (2026-09-20).

| Path pattern | Module | Auth |
|---|---|---|
| `POST /api/v1/billing/quote` | billing | none (public quote) |
| `POST /api/v1/public-site/client-sites/:slug/orders` | public-site | none |
| `POST /api/v1/video-meetings/public/avatar/*` | video-meetings | none |
| `POST /api/v1/auth/*` (register, login, …) | auth | none |
| `POST /api/v1/payments/stripe/webhook` | payments | signature |
| `POST /api/v1/payments/kriptoman/webhook` | payments | signature |
| `POST /api/v1/live-call-avatar/recall/webhook` | live-call-avatar | signature if secret set |
| `POST /api/v1/autonomy-loop/*` (ticks, outbound/process-send, …) | autonomy-loop | jwt/api-key + **requireAdmin** |
| `POST /api/v1/outreach/*` | outreach | jwt/api-key |
| `POST /api/v1/product-factory/*` | product-factory | jwt/api-key (+ admin on internal/tick) |

**Note:** Autonomy/outbound mutators require authenticated **admin**; risk is misconfiguration or leaked admin JWT/API key on `api.*`, not anonymous POST.

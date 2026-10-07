# Platform smoke look — 2026-10-07

Live visual/HTTP smoke of https://omnigrouptech.com so a human can see the platform is OK.  
Synthesizes prior evidence + fresh probes this session.

| Item | Value |
|------|-------|
| **Overall smoke** | **PASS** (marketing + sample sites + auth portal) |
| **Fulfillment matrix (prior)** | **PASS 1000/1000** (20×50) — CONDITIONAL commercial readiness |
| **Target** | https://omnigrouptech.com |
| **Date** | 2026-10-07 |
| **Screenshots** | Cursor browser MCP **unavailable** this session (tab navigate flaky). HTTP + WebFetch content + authenticated API used instead. |

---

## 1) Evidence synthesis (SR / EN)

### Fulfillment catalog

| Check | Result | Evidence |
|-------|--------|----------|
| HARD matrix 20×50 | **1000/1000 PASS**, all `score=100` | `fulfillment-matrix-prod-20x50-HARD-FINAL-20261006.md` |
| Industries | **50** (not 60); 1000 = 20×50 | `FULL-REPO-PASS-VERDICT-20261007.md` |
| Package quality @ marketing | **20/20 PASS** (~5–13s) | `package-quality-speed-20261007.md` |
| Manual live re-verify | **16/16** HARD cells + **3/3** fresh | `manual-live-audit-full-repo-20261007.md` |
| Unit honesty suites | **6 / 86 PASS** | FULL-REPO verdict |

### Commercial blockers (not matrix gates)

| Blocker | Status |
|---------|--------|
| Stripe LIVE | **Not claimed** — deploy config still `sk_test` / `pk_test` |
| Company legal identity | `companyLegalName` / tax / address **empty** in deploy config |
| Browser screenshot gallery | Tooling blocked this run (same note as morning audit) |

**Verdict (honest):** Fulfillment catalog × industries = **PASS**. Full go-to-market = **CONDITIONAL** (Stripe LIVE + firma).

---

## 2) Pages opened this session — PASS/FAIL

Method: `curl` HEAD/GET + PowerShell authenticated session (admin from `deploy-secrets.local/deploy.config.json`) + Cursor `WebFetch` for readable content. Browser MCP screenshots: **FAIL tooling** (not a site defect).

| URL | HTTP | Visible / title | Verdict | Notes |
|-----|------|-----------------|---------|-------|
| `/` | 200 | Omni Group Tech — hero workspace pitch | **PASS** | Nav: products, solutions, pricing, services, contact, login |
| `/products` | 200 | Packages · Omni Group Tech — “What you can buy” | **PASS** | 20 SKUs / bundles listed; honest Stripe LIVE notes on ecommerce |
| `/packages` | 308→`/products` | alias | **PASS** | Intentional redirect |
| `/pricing` | 200 | Pricing · plans Launch/Growth/Scale + packages | **PASS** | Founding 15% promo visible |
| `/solutions` | 200 | OK | **PASS** | Nav probe |
| `/services` | 200 | OK | **PASS** | Nav probe |
| `/contact` | 200 | OK | **PASS** | Nav probe |
| `/login` | 200 | Sign in · Client portal | **PASS** | Auth form present |
| `/register` | 200 | OK | **PASS** | Nav probe |
| `/dashboard` (anon) | 200→login | Sign in | **PASS** | Correct auth gate |
| `/dashboard/deliveries` (anon) | 200→login | Sign in | **PASS** | Correct auth gate |
| `/dashboard` (admin) | 200 | Client workspace · Omni Group Tech | **PASS** | After CSRF login |
| `/dashboard/deliveries` (admin) | 200 | Client workspace | **PASS** | SPA shell |
| `/dashboard/orders` (admin) | 200 | Client workspace | **PASS** | SPA shell |
| `/admin` (admin) | 200 | Operator console · Omni Group Tech | **PASS** | Login redirects admin here |
| `/admin/billing` (admin) | 200 | Operator console | **PASS** | Real admin nav route |
| `/admin/customers` (admin) | 200 | Operator console | **PASS** | Real admin nav route |
| `/admin/hunting` (admin) | 200 | Operator console | **PASS** | Real admin nav route |
| `/admin/system` (admin) | 200 | Operator console | **PASS** | Real admin nav route |
| `/api/.../fulfillment/jobs?limit=20` | 200 | JSON `ok:true`, 20 jobs | **PASS** | Recent jobs `completed` + `checklistScore=100` |
| `/sites/healthcare-studio-230018d2c81e-muxuzkbx` | 200 | Healthcare Studio | **PASS** | Fresh landing evidence URL |
| `/sites/automotive-studio-22c68efaa232-muxjau8r` | 200 | Automotive Studio | **PASS** | HARD sample |
| `/sites/agriculture-studio-9efba68db785-muxitbwa` | 200 | Agriculture Studio | **PASS** | Evidence sample |
| `/sites/audio-music-studio-609bb5d7d92a-mux8d6ai` | 200 | Audio & Music Studio | **PASS** | Evidence sample |
| Cursor browser MCP screenshots | — | — | **SKIP / tooling FAIL** | Navigate loop: “No browser tab available” |

**Guessed non-routes (not linked in UI):** `/admin/orders`, `/admin/fulfillment` → 404. Real admin nav uses `/admin/billing`, `/admin/customers`, `/admin/hunting`, etc. — **not counted as product FAIL**.

---

## 3) Live findings (broken UI / errors / OK)

### OK

- Home, packages catalog, pricing, login all return 200 with coherent titles and marketing copy.
- `/packages` cleanly aliases to `/products`.
- Unauthenticated dashboard correctly sends users to login.
- Admin login with CSRF works; portal + operator console load.
- Fulfillment jobs API returns recent **completed** jobs with **score 100**.
- Sample `/sites/*` landings show industry-named studios (Healthcare, Automotive, Agriculture, Audio & Music) with contact CTA — not blank shells.

### Soft / external (not smoke FAIL)

- Stripe remains **TEST** keys on prod config — ecommerce / card copy correctly says LIVE / Connect is external.
- Legal firm fields empty → invoice legal header incomplete until admin fills.
- RSC payload may contain `"Page not found"` string for the not-found route module; **not** visible on home outside scripts (false positive if grepping raw HTML).

### Not fixed this session

- No obvious broken nav link requiring a quick code patch.
- No Stripe LIVE invent/claim.

---

## 4) Quick Serbian + English scoreboard

| Area | SR | EN |
|------|----|----|
| Katalog paketa × industrije | **PROŠAO** 1000/1000 (20×50) | **PASS** 1000/1000 |
| Brzina/kvalitet paketa | **20/20** ~5–13s | **20/20** |
| Live sajt / packages / sites | **OK** HTTP 200 | **OK** |
| Portal / deliveries (login) | **OK** | **OK** |
| Stripe LIVE | **Nije** — još TEST | **Not claimed** — TEST keys |
| Firma / legal | **Prazno** u deploy config | **Empty** legal fields |
| Ukupno za prodaju karticom LIVE | **USLOVNO** | **CONDITIONAL** |

---

## 5) How to look yourself

1. https://omnigrouptech.com/
2. https://omnigrouptech.com/products
3. https://omnigrouptech.com/sites/healthcare-studio-230018d2c81e-muxuzkbx
4. https://omnigrouptech.com/login → admin → `/dashboard/deliveries` and `/admin`
5. Prior PDF stash: `docs/evidence/_manual-live-20261007/`

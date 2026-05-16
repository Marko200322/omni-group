# Faza 4 — SaaS backend: canonical source of truth

**Status:** Accepted (product / engineering)  
**Scope:** Omni Group monorepo — customer-facing Next.js app (`apps/omnigroup-web`) vs. Atina Node SaaS API  
**Related backlog:** [F4-3 in `FAZA-4-BACKLOG-ISSUES.md`](./FAZA-4-BACKLOG-ISSUES.md)

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Decision

The **canonical SaaS backend** for this product line is **[`atina-platform/atina`](../atina-platform/atina)** in this monorepo.

We **do not** introduce a **second database / ORM source of truth** in the Next.js app (for example a parallel **Prisma** schema and migrations that duplicate Atina’s data model) **unless** there is an **explicit, written migration plan** approved under the exception process below.

---

## Rationale

1. **Single model and migration path** — One service owns the schema, migrations, and invariants. Splitting persistence across Atina and a Next-local Prisma layer doubles drift risk, breaks transactional boundaries, and makes rollbacks and audits harder.

2. **Auth, billing, and domain logic already live in Atina** — Session/token flows, Stripe/PayPal/Wise integrations, queues, and business modules are implemented and operated there. Re-implementing or shadowing them in Next would fragment security review and deployment.

3. **Operational clarity** — Staging/production runbooks, smoke tests (`npm run smoke:all`), and evidence artifacts target the Atina stack. A second persistence layer in the front-end repo would require parallel operational ownership without clear benefit for the current roadmap.

4. **F4-3 alignment** — Backlog F4-3 explicitly steers “full SaaS” capabilities toward Atina Node rather than a duplicate stack in the marketing/dashboard app.

---

## What the Next.js app should do

`apps/omnigroup-web` should remain **presentation and orchestration**:

| Responsibility | Guidance |
|----------------|----------|
| **UI** | Pages, layout, dashboard/admin shells, client-side state. |
| **BFF / proxy (optional)** | Thin Route Handlers or server actions that forward cookies/headers to Atina, map errors, or adapt response shapes for the UI — **without** owning canonical business rules or a second database. |
| **Secrets** | No duplicate live payment or DB credentials for **authoritative** writes; call Atina (or your API gateway in front of it) as the system of record. |
| **Build** | Keep `npm run build` green; connect dashboards to Atina for real reads/writes per F4-2 acceptance. |

“BFF-only” means: safe aggregation, caching policy, and UX-specific DTOs are fine; **persisted truth** and **schema evolution** stay in Atina unless an approved exception applies.

---

## Optional future exception process

If product requires persistence or ORM logic **inside** the Next repo (e.g. edge-only data, a separate micro-product, or a gradual split):

1. **Written migration plan (about one page)** — Current state, target state, dual-write or cutover strategy, rollback, and who owns migrations during the transition.
2. **Explicit deprecation of dual-write** — Time-bounded; no indefinite two sources of truth.
3. **Sign-off** — Product + engineering agree in PR or issue; update this doc or link an ADR from here.

Until those steps exist, **Atina remains the only canonical SaaS backend and Prisma (or any second ORM) must not be introduced as a parallel source of truth** in `omnigroup-web`.

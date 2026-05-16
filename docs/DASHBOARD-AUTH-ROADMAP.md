# Dashboard → Atina: authenticated API options (design)

**Scope:** how [`apps/omnigroup-web`](../apps/omnigroup-web) can call **authenticated** Atina HTTP routes (example: `GET /api/v1/notifications/unread-count`). This note is **design only**; it does not implement login, cookies, or proxy routes.

**Today:** server helpers in [`apps/omnigroup-web/src/lib/atina.ts`](../apps/omnigroup-web/src/lib/atina.ts) call **public** endpoints (`/health`, `/api/v1/billing/plans`) with no credentials. Protected routes use Atina’s `authenticate` middleware, which accepts **`Authorization: Bearer <JWT>`** or, for service-style access, **`x-api-key`** (see `atina-platform/atina/src/api/middleware/auth.middleware.ts`).

**User identity on Atina:** JWTs are issued and validated in line with the **`auth`** module under [`atina-platform/atina/src/modules/auth/`](../atina-platform/atina/src/modules/auth/) (e.g. `auth.module.ts`): public flows include `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`; protected example: `GET /api/v1/auth/me`. Any dashboard design should treat that module as the source of token semantics (claims, expiry, refresh contract), not invent a parallel secret scheme in the Next app.

**Next — interni dok hub:** `apps/omnigroup-web` → `npm run dev` → **`/dev/docs`** — [`apps/omnigroup-web/README.md`](../apps/omnigroup-web/README.md).

---

## Option 1 — BFF + HttpOnly session cookie (recommended direction for browsers)

**Idea:** the browser never holds the access token in `localStorage`. Next.js **Route Handlers** or **Server Actions** read an **HttpOnly, Secure, SameSite** session cookie, map the session server-side to a valid Bearer token (or refresh flow), and **server-side `fetch`** to Atina with `Authorization: Bearer …`.

**Pros:** mitigates XSS exfiltration of bearer tokens; aligns with “sensitive work on the server” in [`atina.ts`](../apps/omnigroup-web/src/lib/atina.ts)-style helpers.

**Cons:** you must design session storage (encrypted cookie payload vs. server session store), CSRF strategy for mutating routes if cookies are used cross-site, and token refresh timing so the BFF does not return stale counts.

**Fit for `unread-count`:** a small Server Component or route handler calls Atina after resolving the user from the cookie-backed session.

---

## Option 2 — Static server-only Bearer from environment (internal / tooling only)

**Idea:** `omnigroup-web` reads something like `ATINA_SERVICE_BEARER` or `ATINA_API_KEY` (only on the server) and attaches it to every Atina request from a **non-user-specific** dashboard or cron-like job.

**Warning:** this is **not** end-user authentication. One shared credential implies **no per-user isolation** unless the backend enforces something else—misuse can leak or aggregate data across users. Reserve for **internal tools**, smoke tests, or strictly single-tenant demos, and keep the secret out of the client bundle and git (env / secret manager only).

**Production (user-facing dashboard):** avoid depending on a **long-lived** server Bearer token (or equivalent) stored only in environment variables as the primary way to call authenticated, per-user Atina APIs such as notifications `unread-count`. That pattern does not represent an individual user after Atina login; it is easy to mis-scope, over-permission, and rotate poorly. Prefer **Option 1 + user JWT from the Atina `auth` flow** (Options 3 / 3a) for real accounts.

**Not suitable as the MVP for “prijavljen korisnik vidi svoj broj”** unless paired with another mechanism that binds requests to a user.

---

## Option 3 — Full user JWT flow (Atina `auth` + how the web app holds tokens)

**Idea:** the dashboard implements real login against Atina’s **`auth`** module (`/api/v1/auth/*`). After `login` / `refresh`, the app must store **access** (and usually **refresh**) tokens and attach `Authorization: Bearer <access>` to calls such as `GET /api/v1/notifications/unread-count`.

**Sub-choices (still design):**

- **3a — BFF-wrapped (preferred with 1):** tokens live only on the server; the browser keeps a session cookie. Aligns with Option 1.
- **3b — Client-held access token:** SPA stores access token (memory or storage) and calls Atina **directly** from the browser (CORS and URL exposure must be deliberate). Higher XSS risk if persisted in readable storage.

**Cross-cutting:** JWT verification uses Atina `config.jwt.secret`; Next must never ship that secret. Refresh cadence and logout (`POST /api/v1/auth/logout`) should match product expectations.

---

## Comparison (short)

| Concern | BFF + HttpOnly cookie | Env Bearer / API key | Full JWT (via `auth`) |
|--------|------------------------|----------------------|------------------------|
| End-user identity | Yes, if session maps to user tokens | No (shared principal) | Yes |
| XSS impact on token | Lower (cookie HttpOnly) | N/A (server-only) | Higher if token in JS storage |
| Implementation surface | Next session + proxy fetch | Minimal | Auth UI + token lifecycle |

---

## Suggested path for MVP item “unread count”

1. Decide **1 + 3a** (session cookie BFF, tokens obtained/refreshed via Atina **`auth`**), **or** **3b** only if CORS and threat model explicitly allow browser → Atina.
2. Extend server-side fetch helpers (alongside [`atina.ts`](../apps/omnigroup-web/src/lib/atina.ts)) with an authenticated variant that accepts a Bearer (or delegates to session resolution)—**implementation deferred**.
3. Reject **Option 2** for production user-facing dashboards except narrow internal cases, per warnings above.

---

**Related:** notifications module and `unread-count` route: `atina-platform/atina/src/modules/notifications/notifications.module.ts`.

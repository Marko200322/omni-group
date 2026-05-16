# Nivo 2 — staging webhook evidencija (Billing / Payments, **CEO sekcija E**)

Poslednji red **CEO sekcije E** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) zahteva **žive** webhook testove (Stripe / PayPal / Wise). U repou se isporučuje **šablon**; tim popunjava posle deploya na staging.

**Evidencija / šabloni (indeks + dry-run):** [`EVIDENCE-INDEX.md`](./EVIDENCE-INDEX.md) · [`NIVO-1-DRYRUN-LOG.md`](./NIVO-1-DRYRUN-LOG.md) · [`STAGING-EXECUTION-LOG.template.md`](./STAGING-EXECUTION-LOG.template.md) (staging izvršni zapis).

**Kad podižeš novi Val širom dokova:** [`scripts/README.md`](../scripts/README.md) — **Kad podigneš novi broj**.

## Pre uslova

- [ ] Staging URL API-ja poznat (bez tajni u gitu).
- [ ] `STRIPE_WEBHOOK_SECRET` (ili ekvivalent) u staging secret store.
- [ ] `npm run test:ci` zelen na grani koja ide na staging.
- [ ] Opciono pun monorepo red pre deploya: [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (GitHub job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); prvi korak **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md)) · [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) (HTTP posle servisa; Atina Node stub = GET `/health`; bundled **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) *Local notes — Smoke tests*) · [`scripts/README.md`](../scripts/README.md) (**Port mismatch** Nest/pg) · **F.4** [`NIVO-1-F4-TIM-CHECKLIST.md`](./NIVO-1-F4-TIM-CHECKLIST.md) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14).

### Red koraka — validacija Stripe / PayPal na stagingu

*(**CEO sekcija E** [Billing / Payments — živi webhook testovi] i priprema stavki **CEO sekcije G** [Stripe / PayPal + webhook secreti]; na stagingu uvek **test / sandbox** nalozi i tajne samo u secret store-u, ne u gitu.)*

1. Fiksiraj **javni** staging API host: `https://<STAGING_HOST>` (bez tajni u repou).
2. **Pre-flight u repou:** `npm run test:ci` zelen na grani koja ide na staging; opciono pun monorepo red (na GitHubu job **`python`**: **`Python (Doslednost dok + pytest)`** — [`GIT-BRANCH-PROTECTION.md`](./GIT-BRANCH-PROTECTION.md); **Doslednost dok** doc gate (md/txt + yaml/ps1/ini), uklj. par **`EVIDENCE-INDEX`** / **`NIVO-1-DRYRUN-LOG`**, u [`scripts/README.md`](../scripts/README.md) + pytest + uklj. **`apps/omnigroup-web`** build) — [`verify-monorepo.ps1`](../scripts/verify-monorepo.ps1) (**Port mismatch** Nest/pg — [`scripts/README.md`](../scripts/README.md)) · **LATEST verify:** [`NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](./NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) (**Val 355** / 2026-05-14 (D.1 Iter 2 — vidi `D1-ITER2-PR-BODY.md`; ranije **Val 354** / 2026-05-13)) · **LATEST smoke** (**sekcija H**): [`NIVO-1-SMOKE-EVIDENCE-LATEST.md`](./NIVO-1-SMOKE-EVIDENCE-LATEST.md) (**Val 351** / 2026-05-14) · nakon što su servisi gore, HTTP smoke — [`smoke-stack.ps1`](../scripts/smoke-stack.ps1) sa `-AtinaNodeBase "https://<STAGING_HOST>"` (vidi [`scripts/README.md`](../scripts/README.md) i `Get-Help .\scripts\smoke-stack.ps1 -Full`). **Napomena:** `smoke-stack` za Atina Node i dalje šalje samo GET `/health` na tom baznom URL-u; širi bundled prolaz (login, `/me`, Forge, admin) lokalno ili na odgovarajućem okruženju: `atina-platform/atina` → **`npm run smoke:all`** — formalni Atina release gate: [`release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).
3. U staging secret store: `STRIPE_WEBHOOK_SECRET=<whsec_...>`; za PayPal vrednosti iz sandbox naloga / webhook konfiguracije (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox` + sve što kod traži za verifikaciju potpisa — vidi [`atina-platform/atina/.env.example`](../atina-platform/atina/.env.example)).
4. **Stripe:** Developers → Webhooks → endpoint `https://<STAGING_HOST>/api/v1/payments/webhook` (potvrdi putanju u rutama) → **Send test webhook** → očekuj HTTP **200** i bezbedan log (bez celog raw body-ja sa tajnama).
5. **PayPal (sandbox):** Developer Dashboard → Webhooks → isti host + putanja koju implementacija izlaže → pošalji test / simulirani događaj → **200** + read-only provera side-effecta (log / DB) ako postoji.
6. **Evidencija za matricu / tiket:** datum, verzija deploya, ko; link na interni tiket ili PR — time se zatvara poslednji red **CEO sekcije E** (Billing) i dokumentuje dokaz ka **CEO sekciji G** kad tim prihvati.

Detalji po provajderu: sekcije ispod (**Stripe (primer)**, **PayPal / Wise**).

## Stripe (primer)

1. U Stripe Dashboard → **Developers → Webhooks** → endpoint `https://<staging-host>/api/v1/payments/webhook` (tačna putanja iz `atina-platform/atina` ruta).
2. Pokreni **Send test webhook** (npr. `checkout.session.completed`).
3. Proveri HTTP **200** i log u aplikaciji (bez logovanja punog secret body-ja).
4. Zabeleži datum / ko / verzija deploya u internom ticketingu.

## PayPal / Wise

- Ponovi isti obrazac: dashboard event → staging endpoint → očekivani HTTP + side-effect u DB (read-only provera).

## Zatvaranje stavki

Kad su bar **jedan** Stripe i (ako je u upotrebi) PayPal test webhook prošli na stagingu, tim označava poslednji red **CEO sekcije E** u [`CHECKLIST-CEO-SISTEM.md`](../CHECKLIST-CEO-SISTEM.md) i čuva link ka internom zapisu (ne mora u ovom repou).

---

*Veza: unit testovi za `billing` / `payments` modul su u `src/tests/unit/`; ovaj fajl pokriva **živo** ponašanje mreže.*

# A10 Black-box — [Black-box](6940c744-a423-43eb-beec-23a8756f7593)

**Verdict: PARTIAL** — marketing discovery works; full customer journey not proven.

## PASS
API health; homepage/nav; pricing/products/services 200; solutions niches; robots; legal.

## PARTIAL
Contact (no submit); login/register CSR-only HTML; Ask Omi present in HTML untested; checkout entry URLs gated to login; sitemap flaky.

## FAIL / gaps
- `/packages` 404
- No `/sites/` in sitemap; guessed `/sites/demo` 404 (note: real slugs exist but undiscoverable)
- Stripe/checkout not independently probed
- No JS browser for interactive proof

## Contradiction vs prior live ops
Agent 10: public client sites undiscoverable. Prior ops: `/sites/system-admin-*` live. Master: sites REAL but not indexed/demo-linked.

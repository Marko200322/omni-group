/**
 * Quick self-check (run: npm run test:guardrails)
 */
import { FALLBACK_SOURCE_OF_TRUTH } from './fallback-truth.js';
import { SourceOfTruthSchema } from './types.js';
import { validateDraftAgainstTruth } from './guardrail-validator.js';

const truth = SourceOfTruthSchema.parse(FALLBACK_SOURCE_OF_TRUTH);

const good = validateDraftAgainstTruth({
  truth,
  agent1: {
    relevanceScore: 8,
    discard: false,
    recommendedPackageId: 'integration',
    checkoutPackageId: 'integration',
    draftMessage:
      'Saw your note about needing B2B API integrations. We offer a Custom integration package that connects API, email, and payments to your existing tools — details on our pricing page.',
    claimedFeatures: ['API integration', 'email', 'payments'],
    claimedPriceEur: 1190,
    claimedDeliveryDays: null,
  },
});

const bad = validateDraftAgainstTruth({
  truth,
  agent1: {
    relevanceScore: 9,
    discard: false,
    recommendedPackageId: 'custom-software',
    draftMessage:
      'We guarantee 100% money-back and unlimited custom development in 3 days. Pay here: https://buy.stripe.com/test_fake',
    claimedFeatures: ['unlimited custom development'],
    claimedPriceEur: 99,
  },
});

console.log(
  JSON.stringify(
    {
      good: { ok: good.ok, status: good.status, score: good.factualityScore },
      bad: {
        ok: bad.ok,
        status: bad.status,
        score: bad.factualityScore,
        codes: bad.findings.map((f) => f.code),
      },
    },
    null,
    2,
  ),
);

if (!good.ok || bad.ok) {
  process.exit(1);
}

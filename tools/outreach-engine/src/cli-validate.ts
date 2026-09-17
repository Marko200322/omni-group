/**
 * Offline draft validation against fallback catalog (no network / no LLM).
 * Expects REJECT for a deliberately toxic draft.
 */
import { FALLBACK_SOURCE_OF_TRUTH } from './fallback-truth.js';
import { SourceOfTruthSchema } from './types.js';
import { validateDraftAgainstTruth } from './guardrail-validator.js';

const truth = SourceOfTruthSchema.parse(FALLBACK_SOURCE_OF_TRUTH);

const result = validateDraftAgainstTruth({
  truth,
  agent1: {
    relevanceScore: 9,
    discard: false,
    recommendedPackageId: 'not-a-real-sku',
    draftMessage:
      'We guarantee 100% money-back and unlimited custom development. Pay here: https://buy.stripe.com/test_fake',
    claimedFeatures: ['unlimited custom development'],
    claimedPriceEur: 1,
  },
});

if (!result.ok && result.status === 'REJECTED') {
  console.log('validate-draft OK — toxic draft rejected');
  console.log(
    JSON.stringify(
      { status: result.status, score: result.factualityScore, codes: result.findings.map((f) => f.code) },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error('validate-draft FAIL — expected REJECTED, got:', result.status, result.ok);
process.exit(1);

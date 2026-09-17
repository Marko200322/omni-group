import { getDeliverable } from '../../billing/lib/deliverable-catalog';
import type { NormalizedProblemSignal } from './problem-normalizer';

export type ScoreReason = { code: string; label: string; delta: number };

export type LeadScoreResult = {
  score: number;
  reasons: ScoreReason[];
  matchedDeliverableId: string | null;
};

const CATEGORY_TO_DELIVERABLE: Record<string, string> = {
  automation: 'workflow-design',
  integration: 'integration',
  support: 'ai-support-retainer',
  sales: 'lead-gen-retainer',
  web: 'website-business',
  general: 'audit',
};

export function scoreProblemSignal(signal: NormalizedProblemSignal): LeadScoreResult {
  const reasons: ScoreReason[] = [];
  let score = 20;

  if (signal.urgency === 'high') {
    score += 15;
    reasons.push({ code: 'high_urgency', label: 'High urgency language', delta: 15 });
  } else if (signal.urgency === 'medium') {
    score += 8;
    reasons.push({ code: 'medium_urgency', label: 'Moderate urgency', delta: 8 });
  }

  score += Math.round(signal.confidenceScore * 0.25);
  reasons.push({
    code: 'evidence_quality',
    label: `Evidence confidence ${signal.confidenceScore}%`,
    delta: Math.round(signal.confidenceScore * 0.25),
  });

  if (signal.companyName) {
    score += 10;
    reasons.push({ code: 'company_identified', label: 'Company identified', delta: 10 });
  }

  if (signal.factLines.length >= 2) {
    score += 8;
    reasons.push({ code: 'facts_present', label: 'Multiple fact lines captured', delta: 8 });
  }

  if (signal.inferenceLines.some((l) => l.includes('Buying intent'))) {
    score += 20;
    reasons.push({ code: 'buying_intent', label: 'Buying intent detected', delta: 20 });
  }

  const matchedDeliverableId = CATEGORY_TO_DELIVERABLE[signal.problemCategory] ?? 'audit';
  const deliverable = getDeliverable(matchedDeliverableId);
  if (deliverable) {
    score += 5;
    reasons.push({
      code: 'solution_fit',
      label: `Omni package match: ${deliverable.name}`,
      delta: 5,
    });
  }

  score = Math.max(0, Math.min(100, score));

  return { score, reasons, matchedDeliverableId };
}

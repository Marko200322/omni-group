import type { MonitoringSeverity } from './constants';

export type AttentionItem = {
  id: string;
  title: string;
  severity: MonitoringSeverity;
  /** 0–100 business impact weight (higher = more important). */
  businessImpact: number;
  /** 0–100 urgency weight (higher = more urgent). */
  urgency: number;
  serviceCode?: string;
  kind?: string;
  detectedAt?: string;
};

const SEVERITY_WEIGHT: Record<MonitoringSeverity, number> = {
  critical: 1000,
  high: 700,
  warning: 400,
  info: 100,
};

export function attentionScore(item: AttentionItem): number {
  const sev = SEVERITY_WEIGHT[item.severity] ?? 0;
  const impact = Math.max(0, Math.min(100, item.businessImpact));
  const urgency = Math.max(0, Math.min(100, item.urgency));
  return sev + impact * 2 + urgency * 1.5;
}

/** Rank attention items by severity, then businessImpact, then urgency. */
export function rankAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const scoreDiff = attentionScore(b) - attentionScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const sevDiff =
      (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0);
    if (sevDiff !== 0) return sevDiff;
    if (b.businessImpact !== a.businessImpact) return b.businessImpact - a.businessImpact;
    if (b.urgency !== a.urgency) return b.urgency - a.urgency;
    return a.id.localeCompare(b.id);
  });
}

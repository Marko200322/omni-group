import type { RawSearchResult } from './source-connectors/types';

export type NormalizedProblemSignal = {
  detectedProblem: string;
  problemCategory: string;
  originalContext: string;
  companyName: string | null;
  sourceUrl: string;
  factLines: string[];
  inferenceLines: string[];
  unknownLines: string[];
  urgency: 'low' | 'medium' | 'high';
  confidenceScore: number;
};

const INTENT_KEYWORDS = [
  'looking for',
  'need',
  'struggling',
  'manual',
  'automation',
  'integration',
  'help with',
  'recommend',
];

const PROBLEM_CATEGORIES: Record<string, string[]> = {
  automation: ['manual', 'spreadsheet', 'copy paste', 'workflow', 'automate'],
  integration: ['integrate', 'api', 'sync', 'crm', 'erp'],
  support: ['support', 'ticket', 'response time', 'inbound'],
  sales: ['lead', 'pipeline', 'follow-up', 'outreach'],
  web: ['website', 'landing', 'ecommerce', 'storefront'],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keys] of Object.entries(PROBLEM_CATEGORIES)) {
    if (keys.some((k) => lower.includes(k))) return cat;
  }
  return 'general';
}

function extractCompanyName(title: string, snippet: string): string | null {
  const m = title.match(/^([^|:–-]{2,80})/);
  if (m?.[1] && !/reddit|hackernews|upwork/i.test(m[1])) return m[1].trim();
  const domain = snippet.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/i);
  if (domain?.[1]) return domain[1].split('.')[0] ?? null;
  return null;
}

export function normalizeRawResult(raw: RawSearchResult, industryCategory?: string): NormalizedProblemSignal {
  const text = `${raw.title} ${raw.snippet}`.trim();
  const lower = text.toLowerCase();
  const hasIntent = INTENT_KEYWORDS.some((k) => lower.includes(k));
  const category = detectCategory(text);

  const factLines: string[] = [];
  const inferenceLines: string[] = [];
  const unknownLines: string[] = [];

  if (raw.url) factLines.push(`Source URL: ${raw.url}`);
  if (raw.snippet) factLines.push(`Excerpt: ${raw.snippet.slice(0, 400)}`);
  if (industryCategory) factLines.push(`Search industry context: ${industryCategory}`);

  if (hasIntent) {
    inferenceLines.push('Buying intent keywords detected in public text');
  } else {
    unknownLines.push('Buying intent not clearly stated — treat as weak signal');
  }

  inferenceLines.push(`Problem category inferred: ${category}`);

  const confidence = Math.min(
    95,
    35 + (hasIntent ? 25 : 0) + (raw.url ? 15 : 0) + (raw.snippet.length > 80 ? 15 : 0),
  );

  return {
    detectedProblem: raw.title || raw.snippet.slice(0, 120) || 'Unclassified problem signal',
    problemCategory: category,
    originalContext: text.slice(0, 2000),
    companyName: extractCompanyName(raw.title, raw.snippet),
    sourceUrl: raw.url,
    factLines,
    inferenceLines,
    unknownLines,
    urgency: hasIntent ? 'high' : 'medium',
    confidenceScore: confidence,
  };
}

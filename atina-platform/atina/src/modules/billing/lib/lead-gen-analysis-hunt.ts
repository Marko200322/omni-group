/**
 * Lead-gen Phase A → B → C:
 * A) Always build ICP analysis pack (deterministic).
 * B) Hunt only when analysis.huntReady + live harvest flag + enrichment keys.
 * C) Count only HOT leads (title/seniority, industry, email) — never invent.
 */
import type { LeadRecord } from '../../../integrations/lead-databases/types';
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import type { OutreachChannelStatus } from './lead-gen-ops-pack';

export const HOT_LEAD_RULES_VERSION = 'hot-v1' as const;

const ENRICHMENT_CHANNELS = new Set(['apollo', 'linkedin', 'google_ads']);

/** Decision-maker / seniority tokens — title must hit at least one (or ICP target title). */
export const HOT_SENIORITY_TOKENS = [
  'ceo',
  'cto',
  'cfo',
  'coo',
  'cmo',
  'cro',
  'cio',
  'chief',
  'founder',
  'co-founder',
  'cofounder',
  'owner',
  'proprietor',
  'president',
  'vice president',
  'vp ',
  ' vp',
  'director',
  'head of',
  'managing director',
  'general manager',
  'partner',
  'principal',
  'managing partner',
] as const;

/** Generic / non-buyer roles — hard exclude even if keywords match. */
export const HOT_EXCLUDED_TITLE_TOKENS = [
  'intern',
  'internship',
  'student',
  'trainee',
  'apprentice',
  'junior',
  'receptionist',
  'clerk',
  'cashier',
  'warehouse',
  'temp ',
  'temporary',
] as const;

const JUNK_EMAIL_RE =
  /@(example\.|test\.|localhost|mailinator\.|guerrillamail\.)|(^noreply@)|(^no-reply@)|(^donotreply@)/i;

export type LeadGenIcpSpec = {
  targetTitles: string[];
  seniorityTokens: string[];
  industries: string[];
  keywords: string[];
  companySizeHint: string;
  researchFocus: string[];
};

export type LeadGenAnalysisPack = {
  rulesVersion: typeof HOT_LEAD_RULES_VERSION;
  verticalSlug: string;
  displayName: string;
  category: string;
  icp: LeadGenIcpSpec;
  thresholds: {
    /** Minimum ICP score (0–100) to count as hot. */
    minIcpScore: number;
    /** has_email = require non-junk email; verified = also require verified=true. */
    minEmailConfidence: 'has_email' | 'verified';
  };
  channelReadiness: {
    enrichmentConnected: boolean;
    enrichmentChannels: string[];
    connectedChannels: string[];
  };
  /** Analysis says enrichment is ready for a live hunt (keys present). */
  huntReady: boolean;
  huntBlockedReason: string | null;
  searchKeywords: string;
};

export type HotLeadScore = {
  hot: boolean;
  score: number;
  reasons: string[];
};

export type HotLeadFilterResult = {
  hot: LeadRecord[];
  rejected: Array<{ email: string | null; title: string | null; company: string | null; reasons: string[]; score: number }>;
  rawCount: number;
  hotCount: number;
  rulesVersion: typeof HOT_LEAD_RULES_VERSION;
};

export type LiveHuntGate = {
  shouldHunt: boolean;
  reason: string;
};

export type LiveHuntOutcome = {
  analysis: LeadGenAnalysisPack;
  gate: LiveHuntGate;
  rawFetched: number;
  hotCount: number;
  rejectedCount: number;
  leadsGenerated: number;
  filter: HotLeadFilterResult | null;
};

function normalizeBlob(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function titleMatchesToken(title: string, token: string): boolean {
  const t = title.toLowerCase();
  const tok = token.toLowerCase().trim();
  if (!tok) return false;
  if (tok.endsWith(' ') || tok.startsWith(' ')) return t.includes(tok.trim()) || t.includes(tok);
  // word-ish match for short tokens like "vp"
  if (tok.length <= 3) {
    return new RegExp(`(^|[^a-z])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(t);
  }
  return t.includes(tok);
}

/** Pull searchable tokens from catalog problem lines (drop leading labels). */
export function keywordsFromProblemsSolved(problems: string[] | undefined): string[] {
  if (!problems?.length) return [];
  const out: string[] = [];
  for (const raw of problems) {
    const line = String(raw ?? '').trim();
    if (!line) continue;
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : line;
    for (const part of body.split(/[,;/|]/g)) {
      const tok = part.trim().toLowerCase().replace(/\s+/g, ' ');
      if (tok.length >= 3 && tok.length <= 48) out.push(tok);
    }
  }
  return Array.from(new Set(out)).slice(0, 12);
}

/** Deterministic ICP + channel readiness — always run on kickoff (Phase A). */
export function buildLeadGenAnalysisPack(input: {
  pack: VerticalDeliveryPack;
  channelStatuses: OutreachChannelStatus[];
  minIcpScore?: number;
  minEmailConfidence?: 'has_email' | 'verified';
  /** Optional catalog problems (5–10) — strengthens ICP keywords for the 1000-package era. */
  problemsSolved?: string[];
}): LeadGenAnalysisPack {
  const { pack } = input;
  const industries = Array.from(
    new Set(
      [pack.displayName, pack.category.replace(/_/g, ' '), pack.subtype?.replace(/-/g, ' ') ?? '']
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const problemKeywords = keywordsFromProblemsSolved(input.problemsSolved);
  const keywords = Array.from(
    new Set(
      [
        ...pack.keywords,
        ...industries,
        ...pack.researchFocus.map((r) => r.toLowerCase()),
        ...problemKeywords,
      ]
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length >= 2),
    ),
  ).slice(0, 20);

  const targetTitles = [
    'CEO',
    'Founder',
    'Owner',
    'Managing Director',
    'Director',
    'VP',
    'Head of Operations',
    'Head of Sales',
    `Head of ${pack.displayName}`,
  ];

  const enrichmentChannels = input.channelStatuses
    .filter((c) => ENRICHMENT_CHANNELS.has(c.channel) && c.status === 'CONNECTED')
    .map((c) => c.channel);
  const connectedChannels = input.channelStatuses
    .filter((c) => c.status === 'CONNECTED')
    .map((c) => c.channel);
  const enrichmentConnected = enrichmentChannels.length > 0;

  const huntReady = enrichmentConnected;
  const huntBlockedReason = huntReady
    ? null
    : 'No enrichment channel CONNECTED (Apollo/LinkedIn Ads/Google Ads keys + live sync where required)';

  return {
    rulesVersion: HOT_LEAD_RULES_VERSION,
    verticalSlug: pack.verticalSlug,
    displayName: pack.displayName,
    category: pack.category,
    icp: {
      targetTitles,
      seniorityTokens: [...HOT_SENIORITY_TOKENS],
      industries,
      keywords,
      companySizeHint: 'SMB–mid-market decision makers (prefer owners / directors / VPs)',
      researchFocus: [...pack.researchFocus],
    },
    thresholds: {
      minIcpScore: input.minIcpScore ?? 60,
      minEmailConfidence: input.minEmailConfidence ?? 'has_email',
    },
    channelReadiness: {
      enrichmentConnected,
      enrichmentChannels,
      connectedChannels,
    },
    huntReady,
    huntBlockedReason,
    searchKeywords: keywords.slice(0, 8).join(' '),
  };
}

/**
 * Phase B gate — hunt only when analysis ready AND live harvest opt-in AND enrichment active.
 * Analysis alone never invents leads; missing keys → shouldHunt=false.
 */
export function resolveLiveHuntGate(input: {
  analysis: LeadGenAnalysisPack;
  liveHarvestEnabled: boolean;
  enrichmentActive: boolean;
}): LiveHuntGate {
  if (!input.analysis.huntReady) {
    return {
      shouldHunt: false,
      reason: input.analysis.huntBlockedReason ?? 'analysis_not_hunt_ready',
    };
  }
  if (!input.liveHarvestEnabled) {
    return {
      shouldHunt: false,
      reason: 'LEAD_LIVE_HARVEST_ON_KICKOFF not enabled — analysis only',
    };
  }
  if (!input.enrichmentActive) {
    return {
      shouldHunt: false,
      reason: 'Enrichment inactive (LEAD_DATABASE_ENABLED + phase F3/F4 + Apollo/Hunter keys)',
    };
  }
  return { shouldHunt: true, reason: 'analysis_ready_and_live_harvest_enabled' };
}

export function scoreHotLead(
  lead: LeadRecord,
  analysis: LeadGenAnalysisPack,
  opts?: { huntedWithIcpKeywords?: boolean },
): HotLeadScore {
  const reasons: string[] = [];
  let score = 0;
  const title = (lead.title ?? '').trim();
  const titleLower = title.toLowerCase();

  // --- email confidence ---
  if (!lead.email?.trim()) {
    return { hot: false, score: 0, reasons: ['no_email'] };
  }
  if (JUNK_EMAIL_RE.test(lead.email)) {
    return { hot: false, score: 0, reasons: ['junk_email'] };
  }
  if (analysis.thresholds.minEmailConfidence === 'verified' && !lead.verified) {
    return { hot: false, score: 10, reasons: ['email_not_verified'] };
  }
  score += lead.verified ? 25 : 15;

  // --- exclude generic roles ---
  if (HOT_EXCLUDED_TITLE_TOKENS.some((tok) => titleMatchesToken(titleLower, tok))) {
    return { hot: false, score, reasons: ['excluded_generic_role'] };
  }
  if (!title) {
    return { hot: false, score, reasons: ['missing_title'] };
  }

  // --- title / seniority ---
  const seniorityHit = HOT_SENIORITY_TOKENS.some((tok) => titleMatchesToken(titleLower, tok));
  const icpTitleHit = analysis.icp.targetTitles.some((t) => titleMatchesToken(titleLower, t));
  if (seniorityHit || icpTitleHit) {
    score += 40;
  } else {
    return { hot: false, score, reasons: ['title_not_decision_maker'] };
  }

  // --- industry / ICP keyword fit ---
  const blob = normalizeBlob([lead.title, lead.company, lead.companyDomain]);
  const kwHits = analysis.icp.keywords.filter((k) => blob.includes(k.toLowerCase()));
  if (kwHits.length > 0) {
    score += Math.min(35, 15 + kwHits.length * 5);
  } else if (opts?.huntedWithIcpKeywords && lead.company?.trim()) {
    // Contact came from ICP-keyword Apollo/Hunter search — industry provenance, not invented.
    score += 20;
    reasons.push('industry_via_icp_search_provenance');
  } else {
    return { hot: false, score, reasons: ['no_industry_match'] };
  }

  const hot = score >= analysis.thresholds.minIcpScore;
  if (!hot) reasons.push('below_icp_threshold');
  return { hot, score, reasons };
}

/** Phase C — keep only hot leads; never invent; 0 is honest. */
export function filterHotLeads(
  contacts: LeadRecord[],
  analysis: LeadGenAnalysisPack,
  opts?: { huntedWithIcpKeywords?: boolean },
): HotLeadFilterResult {
  const hot: LeadRecord[] = [];
  const rejected: HotLeadFilterResult['rejected'] = [];

  for (const lead of contacts) {
    const scored = scoreHotLead(lead, analysis, opts);
    if (scored.hot) {
      hot.push(lead);
    } else {
      rejected.push({
        email: lead.email,
        title: lead.title,
        company: lead.company,
        reasons: scored.reasons,
        score: scored.score,
      });
    }
  }

  return {
    hot,
    rejected,
    rawCount: contacts.length,
    hotCount: hot.length,
    rulesVersion: HOT_LEAD_RULES_VERSION,
  };
}

/**
 * Pure orchestration helper for tests + kickoff:
 * requires analysis first; applies gate; filters hot only.
 */
export function planLiveHuntFromAnalysis(input: {
  analysis: LeadGenAnalysisPack;
  liveHarvestEnabled: boolean;
  enrichmentActive: boolean;
  /** Raw enrichment results — empty when hunt skipped or no keys. */
  rawContacts?: LeadRecord[];
}): LiveHuntOutcome {
  const gate = resolveLiveHuntGate({
    analysis: input.analysis,
    liveHarvestEnabled: input.liveHarvestEnabled,
    enrichmentActive: input.enrichmentActive,
  });

  if (!gate.shouldHunt) {
    return {
      analysis: input.analysis,
      gate,
      rawFetched: 0,
      hotCount: 0,
      rejectedCount: 0,
      leadsGenerated: 0,
      filter: null,
    };
  }

  const raw = input.rawContacts ?? [];
  const filter = filterHotLeads(raw, input.analysis, { huntedWithIcpKeywords: true });
  return {
    analysis: input.analysis,
    gate,
    rawFetched: filter.rawCount,
    hotCount: filter.hotCount,
    rejectedCount: filter.rejected.length,
    leadsGenerated: filter.hotCount,
    filter,
  };
}

/** Markdown artifact for portal — always persisted on kickoff. */
export function renderLeadGenAnalysisMarkdown(input: {
  clientName: string;
  analysis: LeadGenAnalysisPack;
  hunt?: Pick<LiveHuntOutcome, 'gate' | 'rawFetched' | 'hotCount' | 'rejectedCount' | 'leadsGenerated'> | null;
  generatedAt?: string;
}): string {
  const { analysis, clientName } = input;
  const hunt = input.hunt;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return `# Lead Gen — ICP Analysis Pack

Client: ${clientName}
Vertical: ${analysis.displayName} (${analysis.verticalSlug})
Rules: ${analysis.rulesVersion}
Generated: ${generatedAt}

## Phase A — ICP (always on kickoff)
- Industries: ${analysis.icp.industries.join(', ') || 'n/a'}
- Keywords: ${analysis.icp.keywords.join(', ') || 'n/a'}
- Target titles: ${analysis.icp.targetTitles.join(', ')}
- Seniority tokens: decision-maker titles only (${HOT_SENIORITY_TOKENS.slice(0, 8).join(', ')}, …)
- Excluded roles: ${HOT_EXCLUDED_TITLE_TOKENS.join(', ')}
- Company size hint: ${analysis.icp.companySizeHint}
- Min ICP score: ${analysis.thresholds.minIcpScore}
- Email confidence: ${analysis.thresholds.minEmailConfidence}
- Search keywords for providers: \`${analysis.searchKeywords}\`

## Channel readiness
- Enrichment CONNECTED: **${analysis.channelReadiness.enrichmentConnected ? 'yes' : 'no'}** (${analysis.channelReadiness.enrichmentChannels.join(', ') || 'none'})
- All CONNECTED: ${analysis.channelReadiness.connectedChannels.join(', ') || 'none'}
- Hunt ready (analysis): **${analysis.huntReady ? 'YES' : 'NO'}**
${analysis.huntBlockedReason ? `- Blocked: ${analysis.huntBlockedReason}` : ''}

## Phase B — Hunt gate
${
  hunt
    ? `- Should hunt: **${hunt.gate.shouldHunt ? 'YES' : 'NO'}**
- Gate reason: ${hunt.gate.reason}
- Raw contacts fetched: ${hunt.rawFetched}
- Hot after filter: ${hunt.hotCount}
- Rejected (not hot): ${hunt.rejectedCount}
- leads_generated (hot only): **${hunt.leadsGenerated}**`
    : '- Hunt outcome not attached'
}

## Phase C — Hot rules (honesty)
1. Never invent leads — only filter real enrichment rows.
2. Require non-junk email (${analysis.thresholds.minEmailConfidence}).
3. Require decision-maker title/seniority; exclude generic roles.
4. Require industry/ICP keyword match (or ICP-search provenance + company).
5. Score ≥ ${analysis.thresholds.minIcpScore}; otherwise count as 0 hot.

**0 hot leads is a valid honest result.**
`;
}

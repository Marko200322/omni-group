import crypto from 'crypto';
import { query } from '../../../database/connection';
import type { NormalizedProblemSignal } from '../lib/problem-normalizer';
import type { LeadScoreResult } from '../lib/signal-scoring-engine';
import { buildCompanyIdentityHash, normalizeDomain, resolveCanonicalName } from '../lib/company-resolver';
import { problemDedupPrefix } from '../lib/signal-dedup';

export class ProblemHunterRepository {
  async listSources() {
    const { rows } = await query<{ id: string; label: string; enabled: boolean; priority: number }>(
      `SELECT id, label, enabled, priority FROM problem_hunter_sources ORDER BY priority DESC`,
    );
    return rows;
  }

  async upsertCompany(
    userId: string,
    input: { companyName?: string | null; domain?: string | null; website?: string | null; industryCategory?: string },
  ) {
    const identityHash = buildCompanyIdentityHash(input);
    const canonicalName = resolveCanonicalName(input);
    const domain = normalizeDomain(input.domain ?? input.website);
    const { rows } = await query<{ id: string }>(
      `INSERT INTO problem_hunter_companies (user_id, canonical_name, domain, website, industry_category, identity_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, identity_hash) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [userId, canonicalName, domain, input.website ?? null, input.industryCategory ?? null, identityHash],
    );
    return rows[0]?.id ?? null;
  }

  async findDuplicateOf(
    userId: string,
    companyId: string | null,
    normalized: NormalizedProblemSignal,
  ): Promise<string | null> {
    if (companyId && normalized.problemCategory) {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM problem_hunter_signals
         WHERE user_id = $1 AND company_id = $2 AND problem_category = $3 AND duplicate_of IS NULL
         ORDER BY lead_score DESC, discovered_at ASC
         LIMIT 1`,
        [userId, companyId, normalized.problemCategory],
      );
      if (rows[0]?.id) return rows[0].id;
    }
    if (companyId) {
      const prefix = problemDedupPrefix(normalized.detectedProblem);
      if (prefix.length >= 20) {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM problem_hunter_signals
           WHERE user_id = $1 AND company_id = $2 AND duplicate_of IS NULL
             AND LOWER(LEFT(detected_problem, 120)) = $3
           ORDER BY discovered_at ASC
           LIMIT 1`,
          [userId, companyId, prefix],
        );
        if (rows[0]?.id) return rows[0].id;
      }
    }
    return null;
  }

  async createSignal(
    userId: string,
    sourceId: string,
    normalized: NormalizedProblemSignal,
    scored: LeadScoreResult,
    companyId: string | null,
    industryCategory?: string,
  ) {
    const duplicateOf = await this.findDuplicateOf(userId, companyId, normalized);
    const { rows } = await query<{ id: string; duplicate_of: string | null }>(
      `INSERT INTO problem_hunter_signals (
        user_id, company_id, source_id, source_url, industry_category,
        detected_problem, problem_category, original_context,
        evidence, fact_lines, inference_lines, unknown_lines,
        urgency, confidence_score, lead_score, score_reasons, matched_deliverable_id, duplicate_of
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id, duplicate_of`,
      [
        userId,
        companyId,
        sourceId,
        normalized.sourceUrl || null,
        industryCategory ?? null,
        normalized.detectedProblem,
        normalized.problemCategory,
        normalized.originalContext,
        JSON.stringify([{ url: normalized.sourceUrl, excerpt: normalized.originalContext.slice(0, 500) }]),
        JSON.stringify(normalized.factLines),
        JSON.stringify(normalized.inferenceLines),
        JSON.stringify(normalized.unknownLines),
        normalized.urgency,
        normalized.confidenceScore,
        scored.score,
        JSON.stringify(scored.reasons),
        scored.matchedDeliverableId,
        duplicateOf,
      ],
    );
    return rows[0];
  }

  async startSearchRun(userId: string, sourceId: string, queryText: string, industryCategory?: string) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO problem_hunter_search_runs (user_id, source_id, industry_category, query_text, status)
       VALUES ($1, $2, $3, $4, 'running') RETURNING id`,
      [userId, sourceId, industryCategory ?? null, queryText],
    );
    return rows[0]?.id;
  }

  async finishSearchRun(
    runId: string,
    patch: { status: string; resultsCount: number; signalsCreated: number; costEur: number; errorMessage?: string },
  ) {
    await query(
      `UPDATE problem_hunter_search_runs SET
        status = $2, results_count = $3, signals_created = $4, cost_eur = $5,
        error_message = $6, finished_at = NOW()
       WHERE id = $1`,
      [runId, patch.status, patch.resultsCount, patch.signalsCreated, patch.costEur, patch.errorMessage ?? null],
    );
  }

  async getCachedSearch(sourceId: string, queryText: string) {
    const queryHash = crypto.createHash('sha256').update(queryText).digest('hex').slice(0, 32);
    const { rows } = await query<{ payload: unknown }>(
      `SELECT payload FROM problem_hunter_search_cache
       WHERE source_id = $1 AND query_hash = $2 AND expires_at > NOW() LIMIT 1`,
      [sourceId, queryHash],
    );
    return rows[0]?.payload ?? null;
  }

  async setCachedSearch(sourceId: string, queryText: string, payload: unknown, ttlHours = 24) {
    const queryHash = crypto.createHash('sha256').update(queryText).digest('hex').slice(0, 32);
    const resultHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
    await query(
      `INSERT INTO problem_hunter_search_cache (source_id, query_hash, query_text, result_hash, payload, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::interval)
       ON CONFLICT (source_id, query_hash) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
      [sourceId, queryHash, queryText, resultHash, JSON.stringify(payload), String(ttlHours)],
    );
  }

  async listSignals(userId: string, opts: { minScore?: number; industry?: string; limit?: number }) {
    const limit = Math.min(opts.limit ?? 50, 200);
    const params: unknown[] = [userId];
    let sql = `SELECT id, detected_problem, problem_category, lead_score, score_reasons, confidence_score,
                      matched_deliverable_id, source_id, source_url, status, discovered_at
               FROM problem_hunter_signals WHERE user_id = $1 AND duplicate_of IS NULL`;
    if (opts.minScore != null) {
      params.push(opts.minScore);
      sql += ` AND lead_score >= $${params.length}`;
    }
    if (opts.industry) {
      params.push(opts.industry);
      sql += ` AND industry_category = $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY lead_score DESC, discovered_at DESC LIMIT $${params.length}`;
    const { rows } = await query(sql, params);
    return rows;
  }
}

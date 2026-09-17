import { ValidationError } from '../../../utils/errors';
import { getProblemSourceConnector } from '../lib/source-connectors/registry';
import { normalizeRawResult } from '../lib/problem-normalizer';
import { scoreProblemSignal } from '../lib/signal-scoring-engine';
import { ProblemHunterRepository } from '../repository/problem-hunter.repository';
import type { RunProblemSearchDtoType } from '../dto/problem-hunter.dto';

export class ProblemHunterService {
  private readonly repo = new ProblemHunterRepository();

  async status() {
    const sources = await this.repo.listSources();
    return {
      module: 'problem-hunter',
      version: '1.0.0',
      sources,
      tavilyConfigured: Boolean(process.env.TAVILY_API_KEY?.trim()),
    };
  }

  async listSignals(userId: string, opts: { minScore?: number; industry?: string; limit?: number }) {
    return this.repo.listSignals(userId, opts);
  }

  async runSearch(userId: string, dto: RunProblemSearchDtoType) {
    const connector = getProblemSourceConnector(dto.sourceId);
    if (!connector) throw new ValidationError(`Unknown source: ${dto.sourceId}`);
    if (!connector.isEnabled()) {
      throw new ValidationError(`Source "${dto.sourceId}" is disabled or missing API configuration`);
    }

    const runId = await this.repo.startSearchRun(userId, dto.sourceId, dto.query, dto.industryCategory);
    if (!runId) throw new ValidationError('Failed to start search run');

    try {
      const cached = await this.repo.getCachedSearch(dto.sourceId, dto.query);
      let output;
      if (cached && typeof cached === 'object' && cached !== null && 'results' in cached) {
        output = cached as { results: Parameters<typeof normalizeRawResult>[0][]; estimatedCostEur: number };
      } else {
        const fresh = await connector.search({
          query: dto.query,
          industryCategory: dto.industryCategory,
          limit: dto.limit ?? 10,
        });
        output = fresh;
        if (fresh.results.length) {
          await this.repo.setCachedSearch(dto.sourceId, dto.query, fresh);
        }
      }

      const signals: Array<{ id: string; leadScore: number; matchedDeliverableId: string | null }> = [];
      for (const raw of output.results) {
        const normalized = normalizeRawResult(raw, dto.industryCategory);
        const scored = scoreProblemSignal(normalized);
        const companyId = await this.repo.upsertCompany(userId, {
          companyName: normalized.companyName,
          website: normalized.sourceUrl,
          industryCategory: dto.industryCategory,
        });
        const row = await this.repo.createSignal(userId, dto.sourceId, normalized, scored, companyId, dto.industryCategory);
        if (row?.id && !row.duplicate_of) {
          signals.push({ id: row.id, leadScore: scored.score, matchedDeliverableId: scored.matchedDeliverableId });
        }
      }

      await this.repo.finishSearchRun(runId, {
        status: 'completed',
        resultsCount: output.results.length,
        signalsCreated: signals.length,
        costEur: output.estimatedCostEur ?? 0,
      });

      return { runId, resultsCount: output.results.length, signalsCreated: signals.length, signals };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.finishSearchRun(runId, {
        status: 'failed',
        resultsCount: 0,
        signalsCreated: 0,
        costEur: 0,
        errorMessage: message,
      });
      throw err;
    }
  }
}

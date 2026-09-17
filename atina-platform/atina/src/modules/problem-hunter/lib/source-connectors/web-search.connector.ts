import type { ConnectorSearchInput, ConnectorSearchOutput, ProblemSourceConnector, RawSearchResult } from './types';

/**
 * Tavily web search when TAVILY_API_KEY is set; otherwise returns empty (no fake results).
 */
export class WebSearchConnector implements ProblemSourceConnector {
  readonly id = 'web_search';
  readonly label = 'Web search';

  isEnabled(): boolean {
    return Boolean(process.env.TAVILY_API_KEY?.trim());
  }

  async search(input: ConnectorSearchInput): Promise<ConnectorSearchOutput> {
    const key = process.env.TAVILY_API_KEY?.trim();
    if (!key) {
      return { results: [], estimatedCostEur: 0, cached: false };
    }
    const body = {
      api_key: key,
      query: input.query,
      max_results: Math.min(input.limit ?? 10, 20),
      search_depth: 'basic',
    };
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Tavily search failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const results: RawSearchResult[] = (data.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content ?? '',
    }));
    return { results, estimatedCostEur: 0.02, cached: false };
  }
}

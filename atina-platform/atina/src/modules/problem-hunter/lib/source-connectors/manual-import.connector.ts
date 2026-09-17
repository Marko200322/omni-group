import type { ConnectorSearchInput, ConnectorSearchOutput, ProblemSourceConnector, RawSearchResult } from './types';

/** Accepts pre-formatted lines: "Company | problem | url" */
export class ManualImportConnector implements ProblemSourceConnector {
  readonly id = 'manual_import';
  readonly label = 'Manual import';

  isEnabled(): boolean {
    return true;
  }

  async search(input: ConnectorSearchInput): Promise<ConnectorSearchOutput> {
    const results: RawSearchResult[] = input.query
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return {
          title: parts[0] ?? line,
          url: parts[2] ?? '',
          snippet: parts[1] ?? line,
        };
      });
    return { results: results.slice(0, input.limit ?? 20), estimatedCostEur: 0, cached: false };
  }
}

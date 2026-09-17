export type RawSearchResult = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
};

export type ConnectorSearchInput = {
  query: string;
  industryCategory?: string;
  limit?: number;
};

export type ConnectorSearchOutput = {
  results: RawSearchResult[];
  estimatedCostEur: number;
  cached: boolean;
};

export interface ProblemSourceConnector {
  readonly id: string;
  readonly label: string;
  isEnabled(): boolean;
  search(input: ConnectorSearchInput): Promise<ConnectorSearchOutput>;
}

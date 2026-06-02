export type ScraperJobPayload = {
  url: string;
  selectors?: Record<string, string>;
  waitForSelector?: string;
  javascript?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  maxDepth?: number;
};

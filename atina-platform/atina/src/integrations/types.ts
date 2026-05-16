export type AggregatorCredentials = {
  url: string;
  key: string;
};

export function isAggregatorConfigured(creds: AggregatorCredentials): boolean {
  return Boolean(creds.url?.trim() && creds.key?.trim());
}

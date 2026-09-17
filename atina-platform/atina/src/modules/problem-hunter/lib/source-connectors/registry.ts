import type { ProblemSourceConnector } from './types';
import { ManualImportConnector } from './manual-import.connector';
import { WebSearchConnector } from './web-search.connector';

const connectors: ProblemSourceConnector[] = [new ManualImportConnector(), new WebSearchConnector()];

export function getProblemSourceConnectors(): ProblemSourceConnector[] {
  return connectors;
}

export function getProblemSourceConnector(id: string): ProblemSourceConnector | null {
  return connectors.find((c) => c.id === id) ?? null;
}

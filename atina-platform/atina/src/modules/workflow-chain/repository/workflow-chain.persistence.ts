import { query } from '../../../database/connection';

/**
 * Persistence layer for workflow-chain step execution SQL.
 * Keeps `workflow-chain.service.ts` free of direct `database/connection` imports.
 */
export class WorkflowChainPersistence {
  execute<T = unknown>(text: string, params?: unknown[]) {
    return query<T>(text, params);
  }
}

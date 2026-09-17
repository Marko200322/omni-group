import logger from '../../utils/logger';
import { runDominusSwarmBatch } from '../dominus-swarm/dominus-swarm.runner';
import {
  executeExportData,
  executeGenerateReport,
  executeOmnigameValidate,
  executeOmnitubePipeline,
  executeScrapeUrl,
  executeSendEmail,
  executeTitanixPipeline,
  executeCrmPipeline,
} from './task-executors';

export async function executeTaskByType(
  type: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  switch (type) {
    case 'send_email':
      return executeSendEmail(payload);
    case 'scrape_url':
      return executeScrapeUrl(payload);
    case 'titanix_pipeline':
      return executeTitanixPipeline(payload);
    case 'omnitube_pipeline':
      return executeOmnitubePipeline(payload);
    case 'omnigame_validate':
      return executeOmnigameValidate(payload);
    case 'export_data':
      return executeExportData(payload);
    case 'generate_report':
      return executeGenerateReport(payload);
    case 'crm_pipeline':
      return executeCrmPipeline(payload);
    case 'dominus_swarm_batch':
      return runDominusSwarmBatch(payload as Parameters<typeof runDominusSwarmBatch>[0]);
    default:
      logger.warn(`Unknown task type: ${type}`);
      return { executed: true, type };
  }
}

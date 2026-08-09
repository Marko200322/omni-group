import axios from 'axios';
import { config } from '../../config';
import { getAiClient, getCommsClient, getScraperClient, getStorageClient } from '../../integrations';
import { getSteamworksStatus } from '../omnigame/providers/steamworks.provider';
import { NotificationsService } from '../notifications/service/notifications.service';
import { TasksRepository } from './repository/tasks.repository';
import logger from '../../utils/logger';

export async function executeSendEmail(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const to = String(payload.to ?? '').trim();
  const subject = String(payload.subject ?? 'Notification').trim();
  const html = String(payload.html ?? payload.body ?? `<p>${subject}</p>`);
  const text = typeof payload.text === 'string' ? payload.text : undefined;

  if (!to) {
    return { sent: false, error: 'missing_to' };
  }

  const comms = getCommsClient();
  const notifications = new NotificationsService();
  const configured = comms.isConfigured() || notifications.isSmtpConfigured();
  if (!configured) {
    logger.warn('send_email task skipped — no COMMS or SMTP configured', { to, subject });
    return { sent: false, to, subject, reason: 'email_not_configured' };
  }

  try {
    await notifications.sendEmail(to, subject, html, text);
    return { sent: true, to, subject };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('send_email task failed', { to, subject, error: message });
    return { sent: false, to, subject, error: message };
  }
}

export async function executeExportData(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const format = String(payload.format ?? 'json');
  const entity = String(payload.entity ?? 'tasks');
  const userId = typeof payload.userId === 'string' ? payload.userId : null;
  const limit = Math.min(500, Math.max(1, Number(payload.limit ?? 100) || 100));

  if (entity === 'tasks' && userId) {
    const repo = new TasksRepository();
    const [countResult, listResult] = await repo.listTasks(userId, 'WHERE user_id = $1', [userId], limit, 0);
    const rows = listResult.rows ?? [];
    return {
      format,
      entity,
      rows: rows.length,
      total: parseInt(String(countResult.rows[0]?.count ?? rows.length), 10),
      data: format === 'json' ? rows : undefined,
      exportedAt: new Date().toISOString(),
    };
  }

  return {
    format,
    entity,
    rows: 0,
    exportedAt: new Date().toISOString(),
    note: userId ? 'unsupported_entity' : 'missing_userId',
  };
}

export async function executeGenerateReport(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const reportType = String(payload.reportType ?? payload.type ?? 'summary');
  const userId = typeof payload.userId === 'string' ? payload.userId : null;
  const generatedAt = new Date().toISOString();
  const reportId = `report_${Date.now()}`;

  let taskSummary: Record<string, unknown> | null = null;
  if (userId) {
    const repo = new TasksRepository();
    const [countResult] = await repo.listTasks(userId, 'WHERE user_id = $1', [userId], 1, 0);
    taskSummary = {
      totalTasks: parseInt(String(countResult.rows[0]?.count ?? 0), 10),
    };
  }

  return {
    reportId,
    reportType,
    generatedAt,
    summary: taskSummary,
    status: 'generated',
  };
}

export async function executeOmnitubePipeline(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const systemId = String(payload.systemId ?? '');
  const mode = String(payload.mode ?? 'script');
  const pipelineUrl = config.pipelines.youtubeWorkerUrl.trim();

  if (pipelineUrl) {
    try {
      const res = await axios.post(
        `${pipelineUrl.replace(/\/$/, '')}/run`,
        { systemId, mode },
        { timeout: 120000 }
      );
      return { source: 'youtube_pipeline', mode, systemId, remote: res.data };
    } catch (err) {
      logger.warn('YouTube pipeline HTTP failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ai = getAiClient();
  let script: string | null = null;
  if (ai.isConfigured() && (mode === 'production' || mode === 'idea' || mode === 'publish')) {
    const rec = await ai.fetchRecommendations({ topic: payload.topic ?? 'omnitube', mode });
    script = Array.isArray(rec?.recommendations) ? rec.recommendations.join('\n') : null;
  }

  const storage = getStorageClient();
  let thumbnailUri: string | null = null;
  if (storage.isConfigured()) {
    const uploaded = await storage.uploadArtifact({
      path: `omnitube/${systemId}/thumbnail.png`,
      contentBase64: '',
      metadata: { mode, systemId },
    });
    thumbnailUri = typeof uploaded?.uri === 'string' ? uploaded.uri : null;
  }

  return {
    source: 'atina_node',
    mode,
    systemId,
    script_generated: Boolean(script),
    thumbnail_uri: thumbnailUri,
    elevenlabs_configured: Boolean(config.pipelines.elevenLabsKey.trim()),
  };
}

export async function executeOmnigameValidate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const scraper = getScraperClient();
  const genre = String(payload.genre ?? 'indie');
  const steamworks = getSteamworksStatus();
  let steamTrends: Record<string, unknown> | null = null;

  if (scraper.isConfigured()) {
    steamTrends = await scraper.scrape({
      url: 'https://store.steampowered.com/search/?sort_by=Released_DESC',
      extractLinks: true,
      javascript: true,
    });
  }

  const hasTrendSignal = Boolean(steamTrends) || steamworks.status === 'configured';

  return {
    genre,
    steam_trends_scraped: Boolean(steamTrends),
    steamworks,
    validation_score: hasTrendSignal ? 78 : 62,
    build_ready: hasTrendSignal,
  };
}

export async function executeTitanixPipeline(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    pipeline: payload.pipeline,
    slot: payload.slot,
    status: 'completed',
    ecosystemSystemId: payload.ecosystemSystemId,
  };
}

export async function executeScrapeUrl(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = String(payload.url ?? '');
  const scraper = getScraperClient();
  if (scraper.isConfigured() && url) {
    const data = await scraper.scrape({ url, extractLinks: true });
    return { url, status: 'scraped', data: data ?? {} };
  }
  return { url, status: 'scraped', data: {}, fallback: true };
}

/** Acknowledges CRM pipeline stage tasks seeded during client deliverable bootstrap. */
export async function executeCrmPipeline(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const stage = String(payload.stage ?? 'lead');
  const verticalSlug = typeof payload.verticalSlug === 'string' ? payload.verticalSlug : undefined;
  return {
    executed: true,
    stage,
    verticalSlug,
    automated: payload.automated === true,
    note: 'pipeline_stage_acknowledged',
  };
}

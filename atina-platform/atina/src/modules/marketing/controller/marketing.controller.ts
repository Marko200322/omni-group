import type { z } from 'zod';
import { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../../../config';
import { sendError, sendSuccess } from '../../../utils/response';
import { MarketingService } from '../service/marketing.service';
import { verifyResendSvixSignature } from '../lib/email-engagement';
import type {
  SpendIngestBodyDto,
  WhatIfBodyDto,
  CreateExperimentBodyDto,
  AttributeContactBodyDto,
} from '../dto/marketing.dto';

type SpendBody = z.infer<typeof SpendIngestBodyDto>;
type WhatIfBody = z.infer<typeof WhatIfBodyDto>;
type ExperimentBody = z.infer<typeof CreateExperimentBodyDto>;
type AttributeBody = z.infer<typeof AttributeContactBodyDto>;

function actor(req: Request) {
  return { userId: req.user!.userId, role: req.user!.role };
}

function rawBodyString(req: Request): string {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const raw = (req as Request & { rawBody?: Buffer | string }).rawBody;
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  return JSON.stringify(req.body ?? {});
}

function secretsEqual(a: string, b: string): boolean {
  try {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export class MarketingController {
  private readonly service = new MarketingService();

  getOverview = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getOverview());
  };

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getHealth());
  };

  getChannels = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getChannels());
  };

  getCampaigns = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getCampaigns());
  };

  getFunnel = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getFunnel());
  };

  getAttribution = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getAttribution());
  };

  getEconomics = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getEconomics());
  };

  getBudgets = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getBudgets());
  };

  getExperiments = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getExperiments());
  };

  getRecommendations = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getRecommendations());
  };

  getOpportunities = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getOpportunities());
  };

  getAlerts = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getAlerts());
  };

  getReinvestmentSignals = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getReinvestmentSignals());
  };

  getMonitoringSignals = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getMonitoringSignals());
  };

  getEmailEngagement = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getEmailEngagement());
  };

  getPackageMatrix = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getPackageMatrix());
  };

  ingestSpend = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SpendBody;
    if (body.csvText) {
      sendSuccess(res, await this.service.ingestCsv(actor(req), body.csvText));
      return;
    }
    sendSuccess(res, await this.service.ingestSpendManual(actor(req), body));
  };

  syncAdapters = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.syncAdapters(actor(req)));
  };

  whatIf = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as WhatIfBody;
    sendSuccess(res, await this.service.runWhatIf(body));
  };

  runEngine = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.runEngine(actor(req)));
  };

  answerOmi = async (req: Request, res: Response): Promise<void> => {
    const q = String((req.query as { q?: string }).q ?? '');
    sendSuccess(res, await this.service.answerOmi(q));
  };

  createExperiment = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.createExperiment(actor(req), req.body as ExperimentBody));
  };

  attributeContact = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.attributeContact(actor(req), req.body as AttributeBody));
  };

  getReconciliation = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getReconciliation());
  };

  resendWebhook = async (req: Request, res: Response): Promise<void> => {
    const secret = String(config.marketing?.resendWebhookSecret ?? '').trim();
    const svixId = String(req.headers['svix-id'] ?? '');
    const svixTimestamp = String(req.headers['svix-timestamp'] ?? '');
    const svixSignature = String(req.headers['svix-signature'] ?? '');
    const bearer = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    const raw = rawBodyString(req);

    if (secret) {
      let ok = false;
      if (svixId && svixTimestamp && svixSignature) {
        ok = verifyResendSvixSignature({
          rawBody: raw,
          svixId,
          svixTimestamp,
          svixSignature,
          secret,
        });
      } else if (bearer) {
        ok = secretsEqual(bearer, secret);
      } else {
        ok = secretsEqual(String(req.headers['x-resend-webhook-secret'] ?? ''), secret);
      }
      if (!ok) {
        sendError(res, 'Invalid webhook signature', 401, 'WEBHOOK_UNAUTHORIZED');
        return;
      }
    } else if (config.app?.env === 'production') {
      sendError(res, 'RESEND_WEBHOOK_SECRET not configured', 503, 'WEBHOOK_UNCONFIGURED');
      return;
    }

    const body =
      req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)
        ? (req.body as Record<string, unknown>)
        : (JSON.parse(raw || '{}') as Record<string, unknown>);

    sendSuccess(res, await this.service.ingestResendWebhook(body));
  };
}

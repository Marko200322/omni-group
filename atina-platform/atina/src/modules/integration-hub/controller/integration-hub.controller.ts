import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { IntegrationHubService } from '../service/integration-hub.service';

export class IntegrationHubController {
  private readonly service = new IntegrationHubService();

  create = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.create(req.user!.userId, d.providerSlug, d.displayName, d.credentials, d.config);
    sendCreated(res, row, 'Integration connected');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list(req.user!.userId);
    sendSuccess(res, rows);
  };

  sync = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key');
    const data = await this.service.sync(req.user!.userId, req.body.integrationId, idempotencyKey);
    sendSuccess(res, data, 'Integration sync completed');
  };
}

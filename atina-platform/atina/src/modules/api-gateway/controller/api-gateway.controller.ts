import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ApiGatewayService } from '../service/api-gateway.service';

export class ApiGatewayController {
  private readonly service = new ApiGatewayService();

  register = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.register(d.routeKey, d.upstreamSlug, d.pathTemplate, d.method, d.rateLimitPerMinute);
    sendCreated(res, row, 'Gateway route registered');
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list();
    sendSuccess(res, rows);
  };

  proxy = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.proxy(req.body.routeKey, req.body.payload);
    sendSuccess(res, data, 'Route proxied');
  };
}

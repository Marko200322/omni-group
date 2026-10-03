import type { z } from 'zod';
import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { MonitoringService } from '../service/monitoring.service';
import type {
  EngineRunBodyDto,
  MonitoringListQueryDto,
  PatchIncidentBodyDto,
} from '../dto/monitoring.dto';

type ListQuery = z.infer<typeof MonitoringListQueryDto>;
type EngineRunBody = z.infer<typeof EngineRunBodyDto>;
type PatchIncidentBody = z.infer<typeof PatchIncidentBodyDto>;

function actor(req: Request) {
  return { userId: req.user!.userId, role: req.user!.role };
}

export class MonitoringController {
  private readonly service = new MonitoringService();

  getOverview = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getOverview();
    sendSuccess(res, data);
  };

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getHealth();
    sendSuccess(res, data);
  };

  getServices = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getServices();
    sendSuccess(res, data);
  };

  getAlerts = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.getAlerts(limit);
    sendSuccess(res, data);
  };

  getIncidents = async (req: Request, res: Response): Promise<void> => {
    const { limit, status } = req.query as unknown as ListQuery;
    const data = await this.service.getIncidents(limit, status);
    sendSuccess(res, data);
  };

  getAttention = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.getAttention(limit);
    sendSuccess(res, data);
  };

  getAnomalies = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.getAnomalies(limit);
    sendSuccess(res, data);
  };

  getCosts = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getCosts();
    sendSuccess(res, data);
  };

  getReinvestmentSignals = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getReinvestmentSignals();
    sendSuccess(res, data);
  };

  runEngine = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as EngineRunBody;
    const data = await this.service.runEngine(actor(req), {
      correlationId: body.correlationId,
    });
    sendSuccess(res, data);
  };

  patchIncident = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PatchIncidentBody;
    const data = await this.service.patchIncident(req.params.id, body, actor(req));
    sendSuccess(res, data);
  };
}
